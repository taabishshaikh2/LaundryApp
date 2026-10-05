import express from "express";
import mongoose from "mongoose";
import Issue, { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from "../models/Issue.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { notifyAdmins, notifyUser } from "../utils/inAppNotifications.js";
import { uploadPhotos } from "../services/cloudinaryPhotos.js";

const router = express.Router();
router.use(requireAuth);

const cleanId = (value) => String(value || "").replace(/["'\s]/g, "");
const isValidId = (value) => mongoose.Types.ObjectId.isValid(cleanId(value));
const actor = async (id, role) => {
  const user = await User.findById(id).select("name");
  return { changedBy: id, changedByName: user?.name || role, changedByRole: role };
};
function normalizePhotos(value) {
  if (!Array.isArray(value)) return [];
  if (value.length > 3) throw new Error("Maximum 3 photos are allowed");
  return value.map((photo) => {
    const dataUrl = String(photo?.dataUrl || "");
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl) || dataUrl.length > 1_000_000) throw new Error("Each photo must be JPG, PNG, or WebP and under about 750 KB");
    return { dataUrl, caption: String(photo.caption || "").slice(0, 120) };
  });
}
const evidencePopulate = [
  { path: "orderId", select: "serviceName items total status handover processing deliveryProof cancellation pricingRevisions riderId partnerId createdAt", populate: [{ path: "riderId", select: "name phone" }, { path: "partnerId", select: "businessName phone" }] },
  { path: "userId", select: "name email phone" },
  { path: "assignedTo", select: "name email" },
];
function customerSafe(issue) {
  const data = typeof issue.toObject === "function" ? issue.toObject() : issue;
  data.messages = (data.messages || []).filter((message) => message.visibility === "CUSTOMER");
  data.auditTrail = (data.auditTrail || []).filter((entry) => entry.action !== "INTERNAL_NOTE_ADDED");
  return data;
}

router.get("/admin/owners", requirePermission("OPERATIONS"), async (req, res) => {
  const owners = await User.find({ role: "ADMIN" }).select("name email").sort({ name: 1 });
  res.json({ owners });
});

router.get("/admin", requirePermission("OPERATIONS"), async (req, res) => {
  const query = {};
  if (ISSUE_STATUSES.includes(req.query.status)) query.status = req.query.status;
  if (ISSUE_PRIORITIES.includes(req.query.priority)) query.priority = req.query.priority;
  if (ISSUE_CATEGORIES.includes(req.query.category)) query.category = req.query.category;
  if (req.query.assignedTo === "UNASSIGNED") query.assignedTo = null;
  else if (isValidId(req.query.assignedTo)) query.assignedTo = cleanId(req.query.assignedTo);
  if (req.query.overdue === "true") query.resolutionDeadline = { $lt: new Date() }, query.status = { $nin: ["RESOLVED", "CLOSED"] };
  const issues = await Issue.find(query).sort({ createdAt: -1 }).populate(evidencePopulate);
  const rank = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  issues.sort((a, b) => rank[b.priority] - rank[a.priority] || new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ issues });
});

router.get("/mine", async (req, res) => {
  const issues = await Issue.find({ userId: req.user.id }).sort({ createdAt: -1 }).populate("assignedTo", "name");
  const safe = issues.map(customerSafe);
  res.json({ issues: safe });
});

router.post("/", async (req, res) => {
  try {
    if (req.user.role !== "CUSTOMER") return res.status(403).json({ error: "Only customers can raise an issue" });
    const orderId = cleanId(req.body.orderId);
    if (!isValidId(orderId)) return res.status(400).json({ error: "Invalid order" });
    if (!ISSUE_CATEGORIES.includes(req.body.category)) return res.status(400).json({ error: "Choose a valid issue category" });
    const description = String(req.body.description || "").trim();
    if (description.length < 10) return res.status(400).json({ error: "Please describe the issue in at least 10 characters" });
    const order = await Order.findOne({ _id: orderId, userId: req.user.id });
    if (!order) return res.status(404).json({ error: "Order not found" });
    const who = await actor(req.user.id, "CUSTOMER");
    const photos = await uploadPhotos(normalizePhotos(req.body.photos), { orderId, category: "customer-issue" });
    const issue = await Issue.create({ orderId, userId: req.user.id, category: req.body.category, description, photos, auditTrail: [{ ...who, action: "ISSUE_RAISED", note: description, timestamp: new Date() }] });
    notifyAdmins({ title: "New customer issue", message: `${req.body.category.replaceAll("_", " ")} reported for order #${orderId.slice(-6).toUpperCase()}.`, type: "ADMIN_ISSUE", orderId, actionUrl: "/admin/issues" }).catch(() => {});
    await issue.populate(evidencePopulate);
    res.status(201).json({ issue });
  } catch (err) { res.status(err.statusCode || 400).json({ error: err.message || "Could not raise issue" }); }
});

router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid issue ID" });
    const issue = await Issue.findById(cleanId(req.params.id)).populate(evidencePopulate);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    if (req.user.role !== "ADMIN" && String(issue.userId?._id || issue.userId) !== req.user.id) return res.status(403).json({ error: "Not your issue" });
    const data = req.user.role === "ADMIN" ? issue.toObject() : customerSafe(issue);
    res.json({ issue: data });
  } catch (err) { res.status(400).json({ error: "Could not load issue", detail: err.message }); }
});

router.post("/:id/replies", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid issue ID" });
    const issue = await Issue.findById(cleanId(req.params.id));
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    const isAdmin = req.user.role === "ADMIN";
    if (!isAdmin && String(issue.userId) !== req.user.id) return res.status(403).json({ error: "Not your issue" });
    if (["CLOSED"].includes(issue.status)) return res.status(409).json({ error: "A closed issue cannot receive replies" });
    const text = String(req.body.text || "").trim();
    if (text.length < 2) return res.status(400).json({ error: "Reply is required" });
    const who = await actor(req.user.id, req.user.role);
    const visibility = isAdmin && req.body.visibility === "INTERNAL" ? "INTERNAL" : "CUSTOMER";
    issue.messages.push({ text, visibility, addedBy: req.user.id, addedByName: who.changedByName, addedByRole: req.user.role, timestamp: new Date() });
    issue.auditTrail.push({ ...who, action: visibility === "INTERNAL" ? "INTERNAL_NOTE_ADDED" : "REPLY_ADDED", note: text, timestamp: new Date() });
    if (!isAdmin && issue.status === "AWAITING_CUSTOMER") issue.status = "INVESTIGATING";
    await issue.save();
    if (isAdmin && visibility === "CUSTOMER") notifyUser(issue.userId, { title: "Support replied", message: "There is a new reply on your order issue.", type: "ISSUE_UPDATE", orderId: issue.orderId, actionUrl: `/orders/${issue.orderId}`, preference: "orderUpdates" }).catch(() => {});
    res.json({ issue: isAdmin ? issue : customerSafe(issue) });
  } catch (err) { res.status(400).json({ error: err.message || "Could not add reply" }); }
});

router.put("/admin/:id", requirePermission("OPERATIONS"), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid issue ID" });
    const issue = await Issue.findById(cleanId(req.params.id));
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    const who = await actor(req.user.id, "ADMIN");
    const changes = [];
    if (req.body.status !== undefined) {
      if (!ISSUE_STATUSES.includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });
      if (issue.status !== req.body.status) changes.push(`Status: ${issue.status} → ${req.body.status}`);
      issue.status = req.body.status;
      if (req.body.status === "RESOLVED" && !issue.resolvedAt) issue.resolvedAt = new Date();
      if (req.body.status === "CLOSED" && !issue.closedAt) issue.closedAt = new Date();
    }
    if (req.body.priority !== undefined) {
      if (!ISSUE_PRIORITIES.includes(req.body.priority)) return res.status(400).json({ error: "Invalid priority" });
      if (issue.priority !== req.body.priority) changes.push(`Priority: ${issue.priority} → ${req.body.priority}`);
      issue.priority = req.body.priority;
    }
    if (req.body.assignedTo !== undefined) {
      if (req.body.assignedTo && !isValidId(req.body.assignedTo)) return res.status(400).json({ error: "Invalid owner" });
      if (req.body.assignedTo) {
        const owner = await User.findOne({ _id: cleanId(req.body.assignedTo), role: "ADMIN" });
        if (!owner) return res.status(400).json({ error: "Owner must be an admin" });
        issue.assignedTo = owner._id; changes.push(`Assigned to ${owner.name}`);
      } else { issue.assignedTo = null; changes.push("Owner removed"); }
    }
    if (req.body.resolutionDeadline !== undefined) {
      const deadline = req.body.resolutionDeadline ? new Date(req.body.resolutionDeadline) : null;
      if (deadline && Number.isNaN(deadline.getTime())) return res.status(400).json({ error: "Invalid resolution deadline" });
      issue.resolutionDeadline = deadline; changes.push(deadline ? `Deadline: ${deadline.toLocaleString("en-IN")}` : "Deadline removed");
    }
    if (req.body.compensation) {
      const type = req.body.compensation.type || "NONE";
      if (!["NONE", "REFUND", "CREDIT", "REPROCESS"].includes(type)) return res.status(400).json({ error: "Invalid compensation type" });
      const amount = Number(req.body.compensation.amount || 0);
      if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: "Invalid compensation amount" });
      issue.compensation = { type, amount, note: String(req.body.compensation.note || "").trim().slice(0, 1000), decidedAt: new Date(), decidedBy: req.user.id, decidedByName: who.changedByName };
      changes.push(`Compensation: ${type}${amount ? ` ₹${amount}` : ""}`);
    }
    if (!changes.length) return res.status(400).json({ error: "No changes supplied" });
    issue.auditTrail.push({ ...who, action: "ISSUE_UPDATED", note: changes.join("; "), timestamp: new Date() });
    await issue.save(); await issue.populate(evidencePopulate);
    notifyUser(issue.userId?._id || issue.userId, { title: "Issue updated", message: `Your issue is now ${issue.status.replaceAll("_", " ").toLowerCase()}.`, type: "ISSUE_UPDATE", orderId: issue.orderId?._id || issue.orderId, actionUrl: `/orders/${issue.orderId?._id || issue.orderId}`, preference: "orderUpdates" }).catch(() => {});
    res.json({ issue });
  } catch (err) { res.status(400).json({ error: err.message || "Could not update issue" }); }
});

export default router;
