import express from "express";
import mongoose from "mongoose";
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

// FIXED - Line 71
router.put("/riders/:id", async (req, res) => {
  try {
    // Sanitize the ID
    const riderId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(riderId)) {
      return res.status(400).json({ error: "Invalid rider ID format" });
    }

    const { name, phone, active } = req.body;
    const rider = await User.findOneAndUpdate(
      { _id: riderId, role: "RIDER" },
      { ...(name && { name }), ...(phone && { phone }) },
      { new: true }
    ).select("-passwordHash");
    if (!rider) return res.status(404).json({ error: "Rider not found" });
    res.json({ rider });
  } catch (err) {
    res.status(400).json({ error: "Could not update rider", detail: err.message });
  }
});

// ---- Garments / Pricing ----
router.get("/garments", async (req, res) => {
  const garments = await Garment.find().sort({ category: 1, name: 1 });
  res.json({ garments });
});

router.post("/garments", async (req, res) => {
  const { category, name, icon, unit, washingPrice, dryCleaningPrice, ironingRegularPrice, ironingExpressPrice } = req.body;
  if (!category || !name) {
    return res.status(400).json({ error: "category and name are required" });
  }
  const garment = await Garment.create({
    category,
    name,
    icon,
    unit,
    washingPrice: washingPrice || 0,
    dryCleaningPrice: dryCleaningPrice || 0,
    ironingRegularPrice: ironingRegularPrice || 0,
    ironingExpressPrice: ironingExpressPrice || 0,
  });
  res.status(201).json({ garment });
});

// FIXED - Line 97
router.put("/garments/:id", async (req, res) => {
  try {
    // Sanitize the ID
    const garmentId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(garmentId)) {
      return res.status(400).json({ error: "Invalid garment ID format" });
    }

    const { name, washingPrice, dryCleaningPrice, ironingRegularPrice, ironingExpressPrice, active, icon } = req.body;
    const garment = await Garment.findByIdAndUpdate(
      garmentId,
      {
        ...(name !== undefined && { name }),
        ...(washingPrice !== undefined && { washingPrice }),
        ...(dryCleaningPrice !== undefined && { dryCleaningPrice }),
        ...(ironingRegularPrice !== undefined && { ironingRegularPrice }),
        ...(ironingExpressPrice !== undefined && { ironingExpressPrice }),
        ...(active !== undefined && { active }),
        ...(icon !== undefined && { icon }),
      },
      { new: true }
    );
    if (!garment) return res.status(404).json({ error: "Garment not found" });
    res.json({ garment });
  } catch (err) {
    res.status(400).json({ error: "Could not update garment", detail: err.message });
  }
});

// FIXED - Line 113
router.delete("/garments/:id", async (req, res) => {
  try {
    // Sanitize the ID
    const garmentId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(garmentId)) {
      return res.status(400).json({ error: "Invalid garment ID format" });
    }

    const garment = await Garment.findByIdAndDelete(garmentId);
    if (!garment) return res.status(404).json({ error: "Garment not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Could not delete garment", detail: err.message });
  }
});

// ---- Services (Washing / Ironing / Dry Cleaning etc.) ----
router.get("/services", async (req, res) => {
  const services = await Service.find().sort({ createdAt: 1 });
  res.json({ services });
});

router.post("/services", async (req, res) => {
  const { name, code, icon, description, hasExpressOption } = req.body;
  if (!name || !code) return res.status(400).json({ error: "name and code are required" });
  try {
    const service = await Service.create({
      name,
      code: code.toUpperCase().replace(/\s+/g, "_"),
      icon,
      description,
      hasExpressOption: hasExpressOption ?? false,
    });
    res.status(201).json({ service });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "A service with that code already exists" });
    res.status(500).json({ error: "Could not create service", detail: err.message });
  }
});

// FIXED - Line 143
router.put("/services/:id", async (req, res) => {
  try {
    // Sanitize the ID
    const serviceId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ error: "Invalid service ID format" });
    }

    const { name, icon, description, hasExpressOption, active } = req.body;
    const service = await Service.findByIdAndUpdate(
      serviceId,
      {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(description !== undefined && { description }),
        ...(hasExpressOption !== undefined && { hasExpressOption }),
        ...(active !== undefined && { active }),
      },
      { new: true }
    );
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json({ service });
  } catch (err) {
    res.status(400).json({ error: "Could not update service", detail: err.message });
  }
});

// FIXED - Line 160
router.delete("/services/:id", async (req, res) => {
  try {
    // Sanitize the ID
    const serviceId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ error: "Invalid service ID format" });
    }

    const service = await Service.findByIdAndDelete(serviceId);
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Could not delete service", detail: err.message });
  }
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

// FIXED - Line 205
router.put("/laundry-partners/:id", async (req, res) => {
  try {
    // Sanitize the ID
    const partnerId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ error: "Invalid partner ID format" });
    }

    const { businessName, phone, address, servicesOffered, active } = req.body;
    const partner = await LaundryPartner.findByIdAndUpdate(
      partnerId,
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
  } catch (err) {
    res.status(400).json({ error: "Could not update partner", detail: err.message });
  }
});

// FIXED - Line 222
router.delete("/laundry-partners/:id", async (req, res) => {
  try {
    // Sanitize the ID
    const partnerId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ error: "Invalid partner ID format" });
    }

    const partner = await LaundryPartner.findByIdAndDelete(partnerId);
    if (!partner) return res.status(404).json({ error: "Laundry partner not found" });
    if (partner.userId) {
      await User.findByIdAndDelete(partner.userId);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Could not delete partner", detail: err.message });
  }
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