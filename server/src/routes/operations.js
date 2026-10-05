import express from "express";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Slot from "../models/Slot.js";
import User from "../models/User.js";
import LaundryPartner from "../models/LaundryPartner.js";
import Payout from "../models/Payout.js";
import Rating from "../models/Rating.js";
import Notification from "../models/Notification.js";
import AuthSession from "../models/AuthSession.js";
import DataDeletionRequest from "../models/DataDeletionRequest.js";
import Issue from "../models/Issue.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { writeAudit } from "../utils/audit.js";
import { deleteCloudinaryPhotos, orderPhotoPublicIds } from "../services/cloudinaryPhotos.js";

const router = express.Router();
router.use(requireAuth);
const isAdmin = (req) => req.user.role === "ADMIN";
const money = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
const shortId = (order) => String(order._id).slice(-6).toUpperCase();
const invoiceNo = (order) => `DG-${new Date(order.createdAt).getFullYear()}-${shortId(order)}`;

async function accessibleOrder(req, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const query = { _id: id };
  if (req.user.role === "CUSTOMER") query.userId = req.user.id;
  else if (req.user.role === "RIDER") query.riderId = req.user.id;
  else if (req.user.role === "LAUNDRY_PARTNER") {
    const partner = await LaundryPartner.findOne({ userId: req.user.id }).select("_id");
    query.partnerId = partner?._id || null;
  }
  return Order.findOne(query).populate("userId", "name email phone").populate("pickupSlot deliverySlot").populate("riderId", "name phone").populate("partnerId", "businessName phone address");
}

router.get("/orders/:id/invoice", async (req, res) => {
  const order = await accessibleOrder(req, req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  res.set({ "content-type": "application/pdf", "content-disposition": `attachment; filename="invoice-${invoiceNo(order)}.pdf"` });
  doc.pipe(res);
  doc.fontSize(24).fillColor("#102c3c").text(process.env.BUSINESS_LEGAL_NAME || "Dhobi Ghat");
  doc.fontSize(10).fillColor("#56656d").text(process.env.BUSINESS_ADDRESS || "Mumbai, Maharashtra");
  if (process.env.BUSINESS_GSTIN) doc.text(`GSTIN: ${process.env.BUSINESS_GSTIN}`);
  doc.moveDown().fontSize(18).fillColor("#102c3c").text("Tax invoice / receipt");
  doc.fontSize(10).fillColor("#333").text(`Invoice: ${invoiceNo(order)}`).text(`Order: #${shortId(order)}`).text(`Date: ${new Date(order.createdAt).toLocaleString("en-IN")}`).text(`Customer: ${order.userId?.name || "Customer"}`).text(`Address: ${[order.address?.line1, order.address?.line2, order.address?.pincode].filter(Boolean).join(", ")}`);
  doc.moveDown();
  for (const item of order.items) doc.text(`${item.name} x ${item.quantity}`, 48, doc.y, { continued: true }).text(money(item.lineTotal), { align: "right" });
  doc.moveDown().moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#d9dddf").stroke().moveDown();
  const line = (label, value, bold = false) => { if (bold) doc.font("Helvetica-Bold"); doc.text(label, 300, doc.y, { continued: true }).text(money(value), { align: "right" }); if (bold) doc.font("Helvetica"); };
  line("Subtotal", order.subtotal); if (order.discountAmount) line("Discount", -order.discountAmount); if (order.referralCreditUsed) line("Referral credit", -order.referralCreditUsed); line(`${order.taxLabel || "GST"} (${order.taxPercent || 0}%)`, order.gstAmount); if (order.deliveryCharge) line("Delivery charge", order.deliveryCharge); line("Total", order.total, true);
  doc.moveDown(2).fontSize(9).fillColor("#56656d").text(`Payment: ${order.paymentMethod || "Cash on delivery"} · ${order.paymentStatus}`).text("Thank you for choosing Dhobi Ghat.");
  doc.end();
});

router.get("/orders/:id/label", async (req, res) => {
  const order = await accessibleOrder(req, req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  const qr = await QRCode.toBuffer(`${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/orders/${order._id}`, { width: 260, margin: 1 });
  const doc = new PDFDocument({ size: [288, 432], margin: 24 });
  res.set({ "content-type": "application/pdf", "content-disposition": `attachment; filename="bag-label-${shortId(order)}.pdf"` }); doc.pipe(res);
  doc.fontSize(20).font("Helvetica-Bold").text("DHOBI GHAT", { align: "center" }); doc.moveDown().fontSize(28).text(`#${shortId(order)}`, { align: "center" });
  doc.image(qr, 64, 105, { width: 160 }); doc.y = 275; doc.fontSize(12).font("Helvetica").text(order.userId?.name || "Customer", { align: "center" }).text(`${order.serviceName} · ${order.items.reduce((sum, item) => sum + item.quantity, 0)} garments`, { align: "center" }).text(order.address?.pincode || "", { align: "center" }); doc.end();
});

router.get("/orders/:id/rating", async (req, res) => {
  const order = await accessibleOrder(req, req.params.id); if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ rating: await Rating.findOne({ orderId: order._id }).lean() });
});

router.post("/orders/:id/rating", async (req, res) => {
  if (req.user.role !== "CUSTOMER") return res.status(403).json({ error: "Customer access required" });
  const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
  if (!order || order.status !== "DELIVERED") return res.status(409).json({ error: "A delivered order is required before rating" });
  const overall = Number(req.body.overall), riderScore = req.body.riderScore ? Number(req.body.riderScore) : null, partnerScore = req.body.partnerScore ? Number(req.body.partnerScore) : null;
  if (![overall, riderScore, partnerScore].filter(Boolean).every((value) => Number.isInteger(value) && value >= 1 && value <= 5)) return res.status(400).json({ error: "Ratings must be whole numbers from 1 to 5" });
  const rating = await Rating.findOneAndUpdate({ orderId: order._id }, { customerId: req.user.id, riderId: order.riderId, partnerId: order.partnerId, overall, riderScore, partnerScore, comment: String(req.body.comment || "").slice(0, 700) }, { new: true, upsert: true, runValidators: true });
  res.json({ rating });
});

router.get("/manifest", async (req, res) => {
  if (!isAdmin(req) && req.user.role !== "RIDER") return res.status(403).json({ error: "Rider or admin access required" });
  const start = req.query.date ? new Date(`${req.query.date}T00:00:00.000Z`) : new Date(); start.setUTCHours(0, 0, 0, 0); const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  const query = { status: { $nin: ["DELIVERED", "CANCELLED"] }, $or: [{ "pickupSlot.date": { $gte: start, $lt: end } }] };
  if (req.user.role === "RIDER") query.riderId = req.user.id; else if (req.query.riderId) query.riderId = req.query.riderId;
  delete query.$or;
  const orders = await Order.find(query).populate("userId", "name phone").populate("pickupSlot deliverySlot").populate("riderId", "name phone").sort({ createdAt: 1 }).lean();
  const filtered = orders.filter((order) => [order.pickupSlot?.date, order.deliverySlot?.date].some((date) => date && new Date(date) >= start && new Date(date) < end));
  filtered.sort((a, b) => String(a.pickupSlot?.timeRange || a.deliverySlot?.timeRange || "").localeCompare(String(b.pickupSlot?.timeRange || b.deliverySlot?.timeRange || "")));
  const routable = filtered.filter(order => Number.isFinite(order.address?.lat) && Number.isFinite(order.address?.lng));
  if (routable.length > 1) { const remaining = [...routable]; const route = [remaining.shift()]; while (remaining.length) { const last = route[route.length - 1]; remaining.sort((a, b) => Math.hypot(a.address.lat - last.address.lat, a.address.lng - last.address.lng) - Math.hypot(b.address.lat - last.address.lat, b.address.lng - last.address.lng)); route.push(remaining.shift()); } const unroutable = filtered.filter(order => !routable.some(row => String(row._id) === String(order._id))); filtered.splice(0, filtered.length, ...route, ...unroutable); }
  const routeAddresses = filtered.slice(0, 9).map(order => [order.address?.line1, order.address?.landmark, order.address?.pincode].filter(Boolean).join(", ")).filter(Boolean);
  const mapsUrl = routeAddresses.length > 1 ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(routeAddresses[0])}&destination=${encodeURIComponent(routeAddresses[routeAddresses.length - 1])}&waypoints=${encodeURIComponent(routeAddresses.slice(1, -1).join("|"))}` : "";
  res.json({ date: start, mapsUrl, stops: filtered.map((order, index) => ({ sequence: index + 1, order })) });
});

router.get("/admin/overview", requirePermission("OPERATIONS"), async (req, res) => {
  const [payouts, ratings, deletionRequests, riders, partners] = await Promise.all([Payout.find().sort({ createdAt: -1 }).limit(100).populate("riderId", "name").populate("partnerId", "businessName").lean(), Rating.find().sort({ createdAt: -1 }).limit(100).populate("riderId", "name").populate("partnerId", "businessName").lean(), DataDeletionRequest.find().sort({ createdAt: -1 }).populate("userId", "name email").lean(), User.find({ role: "RIDER" }).select("name").lean(), LaundryPartner.find({ active: true }).select("businessName").lean()]);
  const aggregate = (field) => ratings.reduce((map, row) => { const id = String(row[field]?._id || ""); if (!id || !row[field === "riderId" ? "riderScore" : "partnerScore"]) return map; const entry = map.get(id) || { name: row[field]?.name || row[field]?.businessName, total: 0, count: 0 }; entry.total += row[field === "riderId" ? "riderScore" : "partnerScore"]; entry.count++; map.set(id, entry); return map; }, new Map());
  const scores = (map) => [...map.values()].map((row) => ({ name: row.name, score: Math.round(row.total / row.count * 10) / 10, ratings: row.count })).sort((a, b) => b.score - a.score);
  res.json({ payouts, ratings, deletionRequests, riders, partners, riderScores: scores(aggregate("riderId")), partnerScores: scores(aggregate("partnerId")) });
});

router.post("/admin/payouts", requirePermission("OPERATIONS"), async (req, res) => {
  const payeeType = String(req.body.payeeType || "").toUpperCase(); const periodStart = new Date(req.body.periodStart); const periodEnd = new Date(`${req.body.periodEnd}T23:59:59.999Z`);
  if (!["RIDER", "PARTNER"].includes(payeeType) || Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart > periodEnd) return res.status(400).json({ error: "Choose a payee and valid period" });
  const query = { status: "DELIVERED", "deliveryProof.verifiedAt": { $gte: periodStart, $lte: periodEnd } };
  if (payeeType === "RIDER") query.riderId = req.body.payeeId; else query.partnerId = req.body.payeeId;
  const orders = await Order.find(query).select("total").lean(); const grossOrderValue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0); const rate = Math.max(0, Number(req.body.commissionRate || 0)); const commissionType = req.body.commissionType === "FLAT_PER_ORDER" ? "FLAT_PER_ORDER" : "PERCENT"; const amount = commissionType === "PERCENT" ? grossOrderValue * rate / 100 : orders.length * rate;
  const payout = await Payout.create({ payeeType, riderId: payeeType === "RIDER" ? req.body.payeeId : null, partnerId: payeeType === "PARTNER" ? req.body.payeeId : null, periodStart, periodEnd, orderIds: orders.map((order) => order._id), grossOrderValue, commissionType, commissionRate: rate, amount: Math.round(amount * 100) / 100, notes: req.body.notes, createdBy: req.user.id });
  await writeAudit(req, "PAYOUT_CREATED", "Payout", payout._id, { amount: payout.amount }); res.status(201).json({ payout });
});

router.put("/admin/payouts/:id", requirePermission("OPERATIONS"), async (req, res) => {
  const status = String(req.body.status || ""); if (!["APPROVED", "PAID"].includes(status)) return res.status(400).json({ error: "Choose approved or paid" });
  const payout = await Payout.findByIdAndUpdate(req.params.id, { status, paidAt: status === "PAID" ? new Date() : null, paymentReference: String(req.body.paymentReference || "").slice(0, 120) }, { new: true });
  if (!payout) return res.status(404).json({ error: "Payout not found" }); await writeAudit(req, `PAYOUT_${status}`, "Payout", payout._id); res.json({ payout });
});

router.put("/admin/orders/:id/delivery-slot", requirePermission("OPERATIONS"), async (req, res) => {
  const order = await Order.findById(req.params.id); const slot = await Slot.findOne({ _id: req.body.slotId, type: "DELIVERY" });
  if (!order || !slot) return res.status(404).json({ error: "Order or delivery slot not found" });
  if (slot.bookedCount >= slot.maxOrders) return res.status(409).json({ error: "Delivery slot is full" });
  if (order.deliverySlot && String(order.deliverySlot) !== String(slot._id)) await Slot.updateOne({ _id: order.deliverySlot, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });
  if (String(order.deliverySlot || "") !== String(slot._id)) await Slot.updateOne({ _id: slot._id }, { $inc: { bookedCount: 1 } });
  order.deliverySlot = slot._id; await order.save(); await writeAudit(req, "DELIVERY_SLOT_ASSIGNED", "Order", order._id, { slotId: slot._id }); res.json({ order });
});

router.get("/privacy/export", async (req, res) => {
  const [user, orders, ratings, notifications] = await Promise.all([User.findById(req.user.id).select("-passwordHash -verification -twoFactor -sessionVersion").lean(), Order.find({ userId: req.user.id }).lean(), Rating.find({ customerId: req.user.id }).lean(), Notification.find({ userId: req.user.id }).lean()]);
  res.set({ "content-type": "application/json", "content-disposition": `attachment; filename="dhobi-ghat-data-${new Date().toISOString().slice(0, 10)}.json"` }); res.send(JSON.stringify({ exportedAt: new Date(), user, orders, ratings, notifications }, null, 2));
});

router.post("/privacy/delete-request", async (req, res) => {
  const activeOrders = await Order.countDocuments({ userId: req.user.id, status: { $nin: ["DELIVERED", "CANCELLED"] } }); if (activeOrders) return res.status(409).json({ error: "Complete or cancel active orders before requesting deletion" });
  const request = await DataDeletionRequest.findOneAndUpdate({ userId: req.user.id, status: "PENDING" }, { reason: String(req.body.reason || "").slice(0, 500) }, { new: true, upsert: true }); res.status(201).json({ request });
});

router.put("/admin/deletion-requests/:id", requirePermission("CUSTOMERS"), async (req, res) => {
  try {
    const request = await DataDeletionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    const status = String(req.body.status || "");
    if (!["APPROVED", "REJECTED", "COMPLETED"].includes(status)) return res.status(400).json({ error: "Invalid request status" });
    if (status === "COMPLETED") {
      const active = await Order.countDocuments({ userId: request.userId, status: { $nin: ["DELIVERED", "CANCELLED"] } });
      if (active) return res.status(409).json({ error: "This customer still has active orders" });
      const [orders, issues] = await Promise.all([
        Order.find({ userId: request.userId }).select("handover processing deliveryProof").lean(),
        Issue.find({ userId: request.userId }).select("photos").lean(),
      ]);
      const photoIds = [
        ...orders.flatMap(orderPhotoPublicIds),
        ...issues.flatMap((issue) => (issue.photos || []).map((photo) => photo.publicId).filter(Boolean)),
      ];
      await deleteCloudinaryPhotos(photoIds);
      const suffix = String(request.userId).slice(-8);
      await User.updateOne({ _id: request.userId }, { $set: { name: "Deleted customer", email: `deleted-${suffix}@privacy.invalid`, phone: "DELETED", addresses: [], savedGarments: [], referralCredit: 0, emailVerifiedAt: null, phoneVerifiedAt: null }, $unset: { referralCode: 1 }, $inc: { sessionVersion: 1 } });
      await Promise.all([
        AuthSession.deleteMany({ userId: request.userId }),
        Notification.deleteMany({ userId: request.userId }),
        Issue.deleteMany({ userId: request.userId }),
      ]);
    }
    request.status = status;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.reviewNote = String(req.body.reviewNote || "").slice(0, 500);
    await request.save();
    await writeAudit(req, `DATA_DELETION_${status}`, "DataDeletionRequest", request._id);
    res.json({ request });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "Could not update deletion request" });
  }
});

export default router;
