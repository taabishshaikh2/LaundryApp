import express from "express";
import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import ServiceArea from "../models/ServiceArea.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { requireAuth, requireAdmin, requirePermission } from "../middleware/auth.js";
import { writeAudit } from "../utils/audit.js";
import { notifyUser } from "../utils/inAppNotifications.js";

const router = express.Router();
const code = (value) => String(value || "").trim().toUpperCase();
const pin = (value) => String(value || "").replace(/\D/g, "").slice(0, 6);

function couponDiscount(coupon, subtotal) {
  const raw = coupon.discountType === "PERCENT" ? subtotal * coupon.discountValue / 100 : coupon.discountValue;
  return Math.max(0, Math.min(subtotal, coupon.maxDiscount > 0 ? Math.min(raw, coupon.maxDiscount) : raw));
}

async function validateCoupon(couponCode, subtotal, userId) {
  const coupon = await Coupon.findOne({ code: code(couponCode), active: true });
  const now = new Date();
  if (!coupon || coupon.startsAt > now || (coupon.expiresAt && coupon.expiresAt < now)) throw new Error("This coupon is invalid or expired");
  if (subtotal < coupon.minimumOrder) throw new Error(`This coupon requires an order of at least ₹${coupon.minimumOrder}`);
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new Error("This coupon has reached its usage limit");
  const used = await Order.countDocuments({ userId, couponCode: coupon.code, status: { $ne: "CANCELLED" } });
  if (used >= coupon.perCustomerLimit) throw new Error("You have already used this coupon");
  return { coupon, discount: Math.round(couponDiscount(coupon, subtotal) * 100) / 100 };
}

router.get("/areas", async (req, res) => {
  const areas = await ServiceArea.find({ active: true }).sort({ areaName: 1 }).lean();
  res.json({ areas });
});

router.get("/areas/:pincode", async (req, res) => {
  const area = await ServiceArea.findOne({ pincode: pin(req.params.pincode), active: true }).lean();
  if (!area) return res.status(404).json({ supported: false, error: "Pickup is not available for this pincode yet" });
  res.json({ supported: true, area });
});

router.post("/coupons/preview", requireAuth, async (req, res) => {
  try {
    const result = await validateCoupon(req.body.code, Number(req.body.subtotal || 0), req.user.id);
    res.json({ code: result.coupon.code, description: result.coupon.description, discount: result.discount });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

router.get("/retention", requireAuth, async (req, res) => {
  let user = await User.findById(req.user.id).populate("savedGarments.garmentId", "name");
  if (!user.referralCode) {
    user.referralCode = `DG${String(user._id).slice(-6).toUpperCase()}`;
    await user.save();
  }
  res.json({ referralCode: user.referralCode, referralCredit: user.referralCredit, savedGarments: user.savedGarments });
});

router.put("/saved-garments", requireAuth, async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 30) : [];
  const clean = items.filter((item) => mongoose.Types.ObjectId.isValid(item.garmentId)).map((item) => ({ garmentId: item.garmentId, quantity: Math.min(99, Math.max(1, Number(item.quantity || 1))) }));
  const user = await User.findByIdAndUpdate(req.user.id, { savedGarments: clean }, { new: true }).populate("savedGarments.garmentId", "name");
  res.json({ savedGarments: user.savedGarments });
});

router.post("/referral/apply", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.referredBy) return res.status(409).json({ error: "A referral has already been applied" });
  const referrer = await User.findOne({ referralCode: code(req.body.code), role: "CUSTOMER" });
  if (!referrer || String(referrer._id) === req.user.id) return res.status(400).json({ error: "Invalid referral code" });
  user.referredBy = referrer._id; user.referralCredit += 50; referrer.referralCredit += 50;
  await Promise.all([user.save(), referrer.save()]);
  res.json({ referralCredit: user.referralCredit });
});

router.get("/admin/areas", requireAuth, requireAdmin, async (req, res) => res.json({ areas: await ServiceArea.find().sort({ areaName: 1 }) }));
router.post("/admin/areas", requireAuth, requirePermission("OPERATIONS"), async (req, res) => {
  try {
    const pincode = pin(req.body.pincode); if (pincode.length !== 6) return res.status(400).json({ error: "Enter a valid 6-digit pincode" });
    const area = await ServiceArea.findOneAndUpdate({ pincode }, { pincode, areaName: String(req.body.areaName || "").trim(), city: "Mumbai", deliveryCharge: Math.max(0, Number(req.body.deliveryCharge || 0)), active: req.body.active !== false }, { new: true, upsert: true, runValidators: true });
    await writeAudit(req, "SERVICE_AREA_SAVED", "ServiceArea", area._id, { pincode });
    res.status(201).json({ area });
  } catch (error) { res.status(400).json({ error: error.message }); }
});
router.put("/admin/areas/:id", requireAuth, requirePermission("OPERATIONS"), async (req, res) => {
  const area = await ServiceArea.findByIdAndUpdate(req.params.id, { $set: { areaName: String(req.body.areaName || "").trim(), deliveryCharge: Math.max(0, Number(req.body.deliveryCharge || 0)), active: Boolean(req.body.active) } }, { new: true, runValidators: true });
  if (!area) return res.status(404).json({ error: "Service area not found" });
  await writeAudit(req, "SERVICE_AREA_UPDATED", "ServiceArea", area._id, { active: area.active }); res.json({ area });
});

router.get("/admin/coupons", requireAuth, requireAdmin, async (req, res) => res.json({ coupons: await Coupon.find().sort({ createdAt: -1 }) }));
router.post("/admin/coupons", requireAuth, requirePermission("PROMOTIONS"), async (req, res) => {
  try {
    const coupon = await Coupon.create({ code: code(req.body.code), description: req.body.description, discountType: req.body.discountType, discountValue: Number(req.body.discountValue), maxDiscount: Number(req.body.maxDiscount || 0), minimumOrder: Number(req.body.minimumOrder || 0), usageLimit: Number(req.body.usageLimit || 0), perCustomerLimit: Number(req.body.perCustomerLimit || 1), startsAt: req.body.startsAt || new Date(), expiresAt: req.body.expiresAt || null, active: req.body.active !== false, createdBy: req.user.id });
    await writeAudit(req, "COUPON_CREATED", "Coupon", coupon._id, { code: coupon.code });
    if (coupon.active) {
      User.find({ role: "CUSTOMER", "notificationPreferences.promotions": { $ne: false } }).select("_id").lean().then((customers) => Promise.all(customers.map((customer) => notifyUser(customer._id, { title: `New offer: ${coupon.code}`, message: coupon.description || "Use this coupon on your next laundry order.", type: "PROMOTION", actionUrl: "/new-order", preference: "promotions", metadata: { couponCode: coupon.code } })))).catch(() => {});
    }
    res.status(201).json({ coupon });
  } catch (error) { res.status(400).json({ error: error.code === 11000 ? "Coupon code already exists" : error.message }); }
});
router.put("/admin/coupons/:id", requireAuth, requirePermission("PROMOTIONS"), async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { $set: { active: Boolean(req.body.active) } }, { new: true });
  if (!coupon) return res.status(404).json({ error: "Coupon not found" });
  await writeAudit(req, "COUPON_STATUS_CHANGED", "Coupon", coupon._id, { active: coupon.active }); res.json({ coupon });
});

export { validateCoupon };
export default router;
