import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Garment from "../models/Garment.js";
import Service from "../models/Service.js";
import LaundryPartner from "../models/LaundryPartner.js";
import Notification from "../models/Notification.js";
import Issue from "../models/Issue.js";
import Slot from "../models/Slot.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { buildAnalytics } from "../utils/analytics.js";
import AuditLog from "../models/AuditLog.js";
import { requirePermission } from "../middleware/auth.js";
import { writeAudit } from "../utils/audit.js";
import { revokeAllSessions } from "../utils/authSessions.js";

const router = express.Router();

// every route below requires an authenticated admin
router.use(requireAuth, requireAdmin);
router.use((req, res, next) => {
  const section = req.path.split("/").filter(Boolean)[0];
  const permission = { reports: "REPORTS", "report-options": "REPORTS", customers: "CUSTOMERS", riders: "OPERATIONS", garments: "SETTINGS", services: "SETTINGS", "laundry-partners": "OPERATIONS", notifications: "OPERATIONS", security: "ADMIN_ACCESS" }[section];
  return permission ? requirePermission(permission)(req, res, next) : next();
});

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

router.get("/report-options", async (req, res) => {
  const [riders, partners, services] = await Promise.all([
    User.find({ role: "RIDER" }).select("name").sort({ name: 1 }),
    LaundryPartner.find().select("businessName active").sort({ businessName: 1 }),
    Service.find().select("name code active").sort({ name: 1 }),
  ]);
  res.json({ riders, partners, services });
});

router.get("/reports", async (req, res) => {
  try {
    const today = new Date();
    const defaultFrom = new Date(today); defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29); defaultFrom.setUTCHours(0, 0, 0, 0);
    const from = req.query.from ? new Date(`${req.query.from}T00:00:00.000Z`) : defaultFrom;
    const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999Z`) : new Date(today.setUTCHours(23, 59, 59, 999));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return res.status(400).json({ error: "Choose a valid date range" });
    if (to - from > 366 * 86400000) return res.status(400).json({ error: "Reports are limited to a 12-month range" });
    const query = { createdAt: { $gte: from, $lte: to } };
    if (req.query.status) query.status = req.query.status;
    if (req.query.service) query.serviceCode = req.query.service;
    if (req.query.riderId && mongoose.Types.ObjectId.isValid(req.query.riderId)) query.riderId = req.query.riderId;
    if (req.query.partnerId && mongoose.Types.ObjectId.isValid(req.query.partnerId)) query.partnerId = req.query.partnerId;
    const orders = await Order.find(query).populate("userId", "name").populate("riderId", "name").populate("partnerId", "businessName").lean();
    const orderIds = orders.map((order) => order._id);
    const customerIds = [...new Set(orders.map((order) => String(order.userId?._id || order.userId || "")).filter(Boolean))];
    const issueQuery = { createdAt: { $gte: from, $lte: to } };
    if (req.query.status || req.query.service || req.query.riderId || req.query.partnerId) issueQuery.orderId = { $in: orderIds };
    const [issues, slots, firstOrders] = await Promise.all([
      Issue.find(issueQuery).select("orderId category status priority resolutionDeadline createdAt").lean(),
      Slot.find({ date: { $gte: from, $lte: to } }).sort({ date: 1, timeRange: 1 }).lean(),
      customerIds.length ? Order.aggregate([{ $match: { userId: { $in: customerIds.map((id) => new mongoose.Types.ObjectId(id)) } } }, { $group: { _id: "$userId", firstOrderAt: { $min: "$createdAt" } } }]) : [],
    ]);
    const firstOrderByUser = Object.fromEntries(firstOrders.map((row) => [String(row._id), row.firstOrderAt]));
    res.json({ report: buildAnalytics({ orders, issues, slots, firstOrderByUser, from, to }) });
  } catch (err) { res.status(400).json({ error: "Could not build report", detail: err.message }); }
});

router.get("/security", requirePermission("ADMIN_ACCESS"), async (req, res) => {
  const [admins, users, auditLogs] = await Promise.all([
    User.find({ role: "ADMIN" }).select("name email adminPermissions createdAt").sort({ name: 1 }).lean(),
    User.find().select("name email phone role emailVerifiedAt phoneVerifiedAt createdAt").sort({ name: 1 }).lean(),
    AuditLog.find().sort({ createdAt: -1 }).limit(100).populate("actorId", "name email").lean(),
  ]);
  res.json({ admins, users, auditLogs, retentionDays: Math.max(30, Number(process.env.AUDIT_RETENTION_DAYS || 365)) });
});

router.put("/security/admins/:id/permissions", requirePermission("ADMIN_ACCESS"), async (req, res) => {
  const allowed = ["ORDERS", "OPERATIONS", "CUSTOMERS", "PROMOTIONS", "REPORTS", "SETTINGS", "ADMIN_ACCESS"];
  const permissions = [...new Set(Array.isArray(req.body.permissions) ? req.body.permissions.filter((item) => allowed.includes(item)) : [])];
  if (String(req.params.id) === req.user.id && !permissions.includes("ADMIN_ACCESS")) return res.status(400).json({ error: "You cannot remove your own admin-access permission" });
  const admin = await User.findOneAndUpdate({ _id: req.params.id, role: "ADMIN" }, { adminPermissions: permissions }, { new: true }).select("name email adminPermissions");
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  await writeAudit(req, "ADMIN_PERMISSIONS_UPDATED", "User", admin._id, { permissions });
  res.json({ admin });
});

router.put("/security/users/:id/role", requirePermission("ADMIN_ACCESS"), async (req, res) => {
  try {
    const allowedRoles = ["CUSTOMER", "RIDER", "LAUNDRY_PARTNER", "ADMIN"];
    const nextRole = String(req.body.role || "").toUpperCase();
    if (!allowedRoles.includes(nextRole)) return res.status(400).json({ error: "Choose a valid account role" });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid user ID" });
    if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ error: "You cannot change your own role" });
    const account = await User.findById(req.params.id).select("+sessionVersion +twoFactor.secret");
    if (!account) return res.status(404).json({ error: "User not found" });
    if (account.role === nextRole) return res.json({ user: account });
    if (account.role === "ADMIN") {
      const adminCount = await User.countDocuments({ role: "ADMIN" });
      if (adminCount <= 1) return res.status(409).json({ error: "The final administrator cannot be demoted" });
    }
    if (account.role === "RIDER") {
      const activeAssignments = await Order.countDocuments({ riderId: account._id, status: { $nin: ["DELIVERED", "CANCELLED"] } });
      if (activeAssignments) return res.status(409).json({ error: "Reassign this rider's active orders before changing their role" });
    }
    const existingPartner = await LaundryPartner.findOne({ userId: account._id });
    if (account.role === "LAUNDRY_PARTNER" && existingPartner) {
      const activePartnerOrders = await Order.countDocuments({ partnerId: existingPartner._id, status: { $nin: ["DELIVERED", "CANCELLED"] } });
      if (activePartnerOrders) return res.status(409).json({ error: "Reassign this partner's active orders before changing their role" });
      existingPartner.active = false;
      await existingPartner.save();
    }
    if (nextRole === "LAUNDRY_PARTNER") {
      const businessName = String(req.body.businessName || "").trim();
      if (businessName.length < 2) return res.status(400).json({ error: "Business name is required for a laundry partner" });
      await LaundryPartner.findOneAndUpdate(
        { userId: account._id },
        { businessName, phone: account.phone, address: String(req.body.address || "").trim(), active: true },
        { new: true, upsert: true, runValidators: true }
      );
    }
    const fullAdminPermissions = ["ORDERS", "OPERATIONS", "CUSTOMERS", "PROMOTIONS", "REPORTS", "SETTINGS", "ADMIN_ACCESS"];
    const previousRole = account.role;
    account.role = nextRole;
    account.adminPermissions = nextRole === "ADMIN" ? fullAdminPermissions : [];
    if (nextRole !== "ADMIN") account.twoFactor = { enabled: false, secret: "", enabledAt: null };
    account.sessionVersion = Number(account.sessionVersion || 0) + 1;
    await account.save();
    await revokeAllSessions(account._id);
    await writeAudit(req, "USER_ROLE_CHANGED", "User", account._id, { previousRole, nextRole });
    res.json({ user: { id: account._id, name: account.name, email: account.email, role: account.role } });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not change account role" });
  }
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

    const { name, email, phone, password } = req.body;
    const rider = await User.findOne({ _id: riderId, role: "RIDER" }).select("+sessionVersion");
    if (!rider) return res.status(404).json({ error: "Rider not found" });
    if (email && email.toLowerCase() !== rider.email) {
      const duplicate = await User.findOne({ email: email.toLowerCase(), _id: { $ne: rider._id } });
      if (duplicate) return res.status(409).json({ error: "Email already registered" });
      rider.email = email;
    }
    if (name !== undefined) rider.name = String(name).trim();
    if (phone !== undefined) rider.phone = String(phone).trim();
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      rider.passwordHash = await bcrypt.hash(password, 10);
      rider.sessionVersion = Number(rider.sessionVersion || 0) + 1;
    }
    await rider.save();
    if (password) await revokeAllSessions(rider._id);
    const safeRider = rider.toObject();
    delete safeRider.passwordHash;
    res.json({ rider: safeRider });
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

    const { businessName, contactName, email, phone, password, address, servicesOffered, active } = req.body;
    const partner = await LaundryPartner.findById(partnerId);
    if (!partner) return res.status(404).json({ error: "Laundry partner not found" });
    const user = partner.userId ? await User.findById(partner.userId).select("+sessionVersion") : null;
    if (!user) return res.status(404).json({ error: "Partner login account not found" });
    if (email && email.toLowerCase() !== user.email) {
      const duplicate = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (duplicate) return res.status(409).json({ error: "Email already registered" });
      user.email = email;
    }
    if (contactName !== undefined) user.name = String(contactName).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      user.passwordHash = await bcrypt.hash(password, 10);
      user.sessionVersion = Number(user.sessionVersion || 0) + 1;
    }
    if (businessName !== undefined) partner.businessName = String(businessName).trim();
    if (phone !== undefined) partner.phone = String(phone).trim();
    if (address !== undefined) partner.address = String(address).trim();
    if (servicesOffered !== undefined) partner.servicesOffered = servicesOffered;
    if (active !== undefined) partner.active = active;
    await Promise.all([user.save(), partner.save()]);
    if (password) await revokeAllSessions(user._id);
    res.json({ partner: { ...partner.toObject(), userId: { _id: user._id, name: user.name, email: user.email, phone: user.phone } } });
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
  const notifications = await Notification.find({ channel: { $ne: "IN_APP" } })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("userId", "name phone")
    .populate("orderId", "status total");
  res.json({ notifications });
});

export default router;
