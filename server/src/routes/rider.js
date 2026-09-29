import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { advanceOrderStatus } from "../utils/orderStatus.js";
import { actorDetails, handoverSummary, normalizeHandoverItems } from "../utils/handover.js";

const router = express.Router();

router.use(requireAuth, requireRole("RIDER"));

// Statuses a rider is allowed to move an order into, forward-only.
const RIDER_ALLOWED_STATUSES = ["RIDER_ON_THE_WAY", "OUT_FOR_DELIVERY", "DELIVERED"];

router.get("/orders", async (req, res) => {
  const orders = await Order.find({ riderId: req.user.id })
    .sort({ createdAt: 1 })
    .populate("userId", "name phone");
  res.json({ orders });
});

// FIXED - Line 20
router.get("/orders/:id", async (req, res) => {
  try {
    // Sanitize the ID
    const orderId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const order = await Order.findOne({ _id: orderId, riderId: req.user.id }).populate("userId", "name phone");
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not fetch order", detail: err.message });
  }
});

// FIXED - Line 26
router.put("/orders/:id/status", async (req, res) => {
  try {
    // Sanitize the ID
    const orderId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const { status } = req.body;
    if (!RIDER_ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Riders can only set: " + RIDER_ALLOWED_STATUSES.join(", ") });
    }
    const order = await Order.findOne({ _id: orderId, riderId: req.user.id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const expectedNextStatus = {
      PICKUP_ASSIGNED: "RIDER_ON_THE_WAY",
      READY: "OUT_FOR_DELIVERY",
      OUT_FOR_DELIVERY: "DELIVERED",
    }[order.status];
    if (status !== expectedNextStatus) {
      return res.status(409).json({ error: "This status change is not allowed from the order's current stage" });
    }

    await advanceOrderStatus(order, status, { userId: req.user.id, role: "RIDER" });
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not update order status", detail: err.message });
  }
});

// Confirm the garments physically received. This is the only rider path to PICKED_UP.
router.put("/orders/:id/handover", async (req, res) => {
  try {
    const orderId = req.params.id.replace(/["'\s]/g, "");
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ error: "Invalid order ID format" });
    const order = await Order.findOne({ _id: orderId, riderId: req.user.id });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (["CANCELLED", "DELIVERED"].includes(order.status)) return res.status(409).json({ error: "This order can no longer be changed" });
    if (!["PICKUP_ASSIGNED", "RIDER_ON_THE_WAY", "PICKED_UP"].includes(order.status)) {
      return res.status(409).json({ error: "Handover can only be recorded during pickup" });
    }

    const items = normalizeHandoverItems(req.body.items, order.items);
    const actor = await actorDetails(req.user.id, "RIDER");
    const firstConfirmation = !order.handover?.confirmedAt;
    const now = new Date();
    order.handover.items = items;
    order.handover.generalNotes = String(req.body.generalNotes || "").trim().slice(0, 1000);
    order.handover.confirmedAt ||= now;
    order.handover.confirmedBy ||= req.user.id;
    order.handover.confirmedByName ||= actor.changedByName;
    order.handover.confirmedByRole ||= "RIDER";
    order.handover.lastUpdatedAt = now;
    order.handover.auditTrail.push({
      ...actor,
      action: firstConfirmation ? "CONFIRMED" : "UPDATED",
      summary: handoverSummary(items),
      timestamp: now,
    });
    await order.save();

    if (firstConfirmation && order.status !== "PICKED_UP") {
      await advanceOrderStatus(order, "PICKED_UP", {
        userId: req.user.id,
        role: "RIDER",
        note: handoverSummary(items),
      });
    }
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not save handover" });
  }
});

// FIXED - Line 38
router.post("/orders/:id/notes", async (req, res) => {
  try {
    // Sanitize the ID
    const orderId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Note text is required" });
    const order = await Order.findOne({ _id: orderId, riderId: req.user.id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.notes.push({ text, addedBy: req.user.id, addedByRole: "RIDER", timestamp: new Date() });
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not add note", detail: err.message });
  }
});

export default router;
