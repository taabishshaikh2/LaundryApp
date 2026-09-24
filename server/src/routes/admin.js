import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Garment from "../models/Garment.js";
import Service from "../models/Service.js";
import LaundryPartner from "../models/LaundryPartner.js";
import Notification from "../models/Notification.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// every route below requires an authenticated admin
router.use(requireAuth, requireAdmin);

// ---- Dashboard summary ----
router.get("/summary", async (req, res) => {
  const [customerCount, riderCount, orderCount, orders] = await Promise.all([
    User.countDocuments({ role: "CUSTOMER" }),
    User.countDocuments({ role: "RIDER" }),
    Order.countDocuments(),
    Order.find({}, "total status"),
  ]);
  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;
  res.json({ customerCount, riderCount, orderCount, revenue, activeOrders });
});

// ---- Customers ----
router.get("/customers", async (req, res) => {
  const customers = await User.find({ role: "CUSTOMER" }).select("-passwordHash").sort({ createdAt: -1 });
  const withOrderCounts = await Promise.all(
    customers.map(async (c) => {
      const orderCount = await Order.countDocuments({ userId: c._id });
      return { ...c.toObject(), orderCount };
    })
  );
  res.json({ customers: withOrderCounts });
});

// ---- Riders ----
router.get("/riders", async (req, res) => {
  const riders = await User.find({ role: "RIDER" }).select("-passwordHash").sort({ createdAt: -1 });
  res.json({ riders });
});

router.post("/riders", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const rider = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: "RIDER",
      onboarding: { completed: true },
    });
    res.status(201).json({ rider: { ...rider.toObject(), passwordHash: undefined } });
  } catch (err) {
    res.status(500).json({ error: "Could not create rider", detail: err.message });
  }
});

router.put("/riders/:id", async (req, res) => {
  const { name, phone, active } = req.body;
  const rider = await User.findOneAndUpdate(
    { _id: req.params.id, role: "RIDER" },
    { ...(name && { name }), ...(phone && { phone }) },
    { new: true }
  ).select("-passwordHash");
  if (!rider) return res.status(404).json({ error: "Rider not found" });
  res.json({ rider });
});

// ---- Garments / Pricing ----
router.get("/garments", async (req, res) => {
  const garments = await Garment.find().sort({ category: 1, name: 1 });
  res.json({ garments });
});

router.post("/garments", async (req, res) => {
  const { category, name, icon, unit, priceRegular } = req.body;
  if (!category || !name || priceRegular == null) {
    return res.status(400).json({ error: "category, name and priceRegular are required" });
  }
  const garment = await Garment.create({ category, name, icon, unit, priceRegular });
  res.status(201).json({ garment });
});

router.put("/garments/:id", async (req, res) => {
  const { name, priceRegular, active, icon } = req.body;
  const garment = await Garment.findByIdAndUpdate(
    req.params.id,
    {
      ...(name !== undefined && { name }),
      ...(priceRegular !== undefined && { priceRegular }),
      ...(active !== undefined && { active }),
      ...(icon !== undefined && { icon }),
    },
    { new: true }
  );
  if (!garment) return res.status(404).json({ error: "Garment not found" });
  res.json({ garment });
});

router.delete("/garments/:id", async (req, res) => {
  const garment = await Garment.findByIdAndDelete(req.params.id);
  if (!garment) return res.status(404).json({ error: "Garment not found" });
  res.json({ ok: true });
});

// ---- Services (Washing / Ironing / Dry Cleaning etc.) ----
router.get("/services", async (req, res) => {
  const services = await Service.find().sort({ createdAt: 1 });
  res.json({ services });
});

router.post("/services", async (req, res) => {
  const { name, code, icon, description, priceMultiplier } = req.body;
  if (!name || !code) return res.status(400).json({ error: "name and code are required" });
  try {
    const service = await Service.create({
      name,
      code: code.toUpperCase().replace(/\s+/g, "_"),
      icon,
      description,
      priceMultiplier: priceMultiplier ?? 1,
    });
    res.status(201).json({ service });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "A service with that code already exists" });
    res.status(500).json({ error: "Could not create service", detail: err.message });
  }
});

router.put("/services/:id", async (req, res) => {
  const { name, icon, description, priceMultiplier, active } = req.body;
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
      ...(description !== undefined && { description }),
      ...(priceMultiplier !== undefined && { priceMultiplier }),
      ...(active !== undefined && { active }),
    },
    { new: true }
  );
  if (!service) return res.status(404).json({ error: "Service not found" });
  res.json({ service });
});

router.delete("/services/:id", async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) return res.status(404).json({ error: "Service not found" });
  res.json({ ok: true });
});

// ---- Laundry Partners (each has its own login account, role LAUNDRY_PARTNER) ----
router.get("/laundry-partners", async (req, res) => {
  const partners = await LaundryPartner.find().sort({ createdAt: -1 }).populate("userId", "name email phone");
  res.json({ partners });
});

router.post("/laundry-partners", async (req, res) => {
  try {
    const { businessName, contactName, email, phone, password, address, servicesOffered } = req.body;
    if (!businessName || !contactName || !email || !phone || !password) {
      return res.status(400).json({ error: "businessName, contactName, email, phone and password are required" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: contactName,
      email,
      phone,
      passwordHash,
      role: "LAUNDRY_PARTNER",
      onboarding: { completed: true },
    });

    const partner = await LaundryPartner.create({
      userId: user._id,
      businessName,
      phone,
      address,
      servicesOffered,
    });

    res.status(201).json({ partner: { ...partner.toObject(), userId: { _id: user._id, name: user.name, email: user.email, phone: user.phone } } });
  } catch (err) {
    res.status(500).json({ error: "Could not create laundry partner", detail: err.message });
  }
});

router.put("/laundry-partners/:id", async (req, res) => {
  const { businessName, phone, address, servicesOffered, active } = req.body;
  const partner = await LaundryPartner.findByIdAndUpdate(
    req.params.id,
    {
      ...(businessName !== undefined && { businessName }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(servicesOffered !== undefined && { servicesOffered }),
      ...(active !== undefined && { active }),
    },
    { new: true }
  );
  if (!partner) return res.status(404).json({ error: "Laundry partner not found" });
  res.json({ partner });
});

router.delete("/laundry-partners/:id", async (req, res) => {
  const partner = await LaundryPartner.findByIdAndDelete(req.params.id);
  if (!partner) return res.status(404).json({ error: "Laundry partner not found" });
  if (partner.userId) {
    await User.findByIdAndDelete(partner.userId);
  }
  res.json({ ok: true });
});

// ---- Notifications log (WhatsApp messages sent per order) ----
router.get("/notifications", async (req, res) => {
  const notifications = await Notification.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("userId", "name phone")
    .populate("orderId", "status total");
  res.json({ notifications });
});

export default router;
