import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import LaundryPartner from "../models/LaundryPartner.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { advanceOrderStatus } from "../utils/orderStatus.js";

const router = express.Router();

router.use(requireAuth, requireRole("LAUNDRY_PARTNER"));

async function getOwnPartner(req, res) {
  const partner = await LaundryPartner.findOne({ userId: req.user.id });
  if (!partner) {
    res.status(404).json({ error: "No laundry partner profile linked to this account" });
    return null;
  }
  return partner;
}

router.get("/orders", async (req, res) => {
  const partner = await getOwnPartner(req, res);
  if (!partner) return;

  const orders = await Order.find({ partnerId: partner._id })
    .sort({ createdAt: 1 })
    .populate("userId", "name phone");
  res.json({ orders });
});

// FIXED - Line 30
router.put("/orders/:id/status", async (req, res) => {
  try {
    // Sanitize the ID
    const orderId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const { status } = req.body;
    if (status !== "READY") {
      return res.status(400).json({ error: "Laundry partners can only mark an order READY" });
    }

    const partner = await getOwnPartner(req, res);
    if (!partner) return;

    const order = await Order.findOne({ _id: orderId, partnerId: partner._id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    await advanceOrderStatus(order, "READY", { userId: req.user.id, role: "LAUNDRY_PARTNER" });
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not update order status", detail: err.message });
  }
});

// FIXED - Line 46
router.post("/orders/:id/notes", async (req, res) => {
  try {
    // Sanitize the ID
    const orderId = req.params.id.replace(/["'\s]/g, '');
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Note text is required" });

    const partner = await getOwnPartner(req, res);
    if (!partner) return;

    const order = await Order.findOne({ _id: orderId, partnerId: partner._id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.notes.push({ text, addedBy: req.user.id, addedByRole: "LAUNDRY_PARTNER", timestamp: new Date() });
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not add note", detail: err.message });
  }
});

export default router;