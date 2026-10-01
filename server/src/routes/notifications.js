import express from "express";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 40)));
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user.id, channel: "IN_APP" }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ userId: req.user.id, channel: "IN_APP", readAt: null }),
  ]);
  res.json({ notifications, unreadCount });
});

router.get("/unread-count", async (req, res) => {
  const unreadCount = await Notification.countDocuments({ userId: req.user.id, channel: "IN_APP", readAt: null });
  res.json({ unreadCount });
});

router.put("/read-all", async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, channel: "IN_APP", readAt: null }, { $set: { readAt: new Date() } });
  res.json({ ok: true, unreadCount: 0 });
});

router.put("/:id/read", async (req, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id, channel: "IN_APP" }, { $set: { readAt: new Date() } }, { new: true });
  if (!notification) return res.status(404).json({ error: "Notification not found" });
  res.json({ notification });
});

router.get("/preferences", async (req, res) => {
  const user = await User.findById(req.user.id).select("notificationPreferences").lean();
  res.json({ preferences: user?.notificationPreferences || {} });
});

router.put("/preferences", async (req, res) => {
  const allowed = ["orderUpdates", "riderAssignments", "promotions", "adminAlerts"];
  const updates = {};
  for (const key of allowed) if (typeof req.body[key] === "boolean") updates[`notificationPreferences.${key}`] = req.body[key];
  const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select("notificationPreferences");
  res.json({ preferences: user.notificationPreferences });
});

export default router;
