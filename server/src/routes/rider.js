import express from "express";
import Order from "../models/Order.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { advanceOrderStatus } from "../utils/orderStatus.js";

const router = express.Router();

router.use(requireAuth, requireRole("RIDER"));

// Statuses a rider is allowed to move an order into, forward-only.
const RIDER_ALLOWED_STATUSES = ["RIDER_ON_THE_WAY", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];

router.get("/orders", async (req, res) => {
  const orders = await Order.find({ riderId: req.user.id })
    .sort({ createdAt: 1 })
    .populate("userId", "name phone");
  res.json({ orders });
});

router.get("/orders/:id", async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, riderId: req.user.id }).populate("userId", "name phone");
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ order });
});

router.put("/orders/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!RIDER_ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Riders can only set: " + RIDER_ALLOWED_STATUSES.join(", ") });
  }
  const order = await Order.findOne({ _id: req.params.id, riderId: req.user.id });
  if (!order) return res.status(404).json({ error: "Order not found" });

  await advanceOrderStatus(order, status, { userId: req.user.id, role: "RIDER" });
  res.json({ order });
});

router.post("/orders/:id/notes", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Note text is required" });
  const order = await Order.findOne({ _id: req.params.id, riderId: req.user.id });
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.notes.push({ text, addedBy: req.user.id, addedByRole: "RIDER", timestamp: new Date() });
  await order.save();
  res.json({ order });
});

export default router;
