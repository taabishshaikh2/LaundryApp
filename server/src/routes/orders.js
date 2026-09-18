import express from "express";
import mongoose from "mongoose";
import Order, { ORDER_STATUS_LIST } from "../models/Order.js";
import Garment from "../models/Garment.js";
import Service from "../models/Service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const GST_PERCENT = 18;
const PRIORITY_MULTIPLIER = 1.3;

// Create order (customer)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { address, priority, items, serviceId } = req.body;
    if (!address?.line1 || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Address and at least one item are required" });
    }
    if (!serviceId) {
      return res.status(400).json({ error: "A laundry service (Washing/Ironing/Dry Cleaning) is required" });
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.active) {
      return res.status(400).json({ error: "Invalid or inactive service selected" });
    }

    const garmentIds = items.map((i) => i.garmentId);
    const garments = await Garment.find({ _id: { $in: garmentIds } });
    const garmentMap = new Map(garments.map((g) => [String(g._id), g]));

    let subtotal = 0;
    const priorityFactor = priority === "PRIORITY" ? PRIORITY_MULTIPLIER : 1;
    const serviceFactor = service.priceMultiplier || 1;

    const orderItems = items.map((i) => {
      const garment = garmentMap.get(String(i.garmentId));
      if (!garment) throw new Error(`Unknown garment: ${i.garmentId}`);
      const unitPrice = Math.round(garment.priceRegular * serviceFactor * priorityFactor);
      const lineTotal = unitPrice * i.quantity;
      subtotal += lineTotal;
      return {
        garmentId: garment._id,
        name: garment.name,
        quantity: i.quantity,
        treatment: i.treatment || "WASH_IRON",
        hasStain: !!i.hasStain,
        unitPrice,
        lineTotal,
      };
    });

    const gstAmount = Math.round((subtotal * GST_PERCENT) / 100);
    const total = subtotal + gstAmount;

    const order = await Order.create({
      userId: req.user.id,
      address,
      priority: priority || "REGULAR",
      serviceId: service._id,
      serviceName: service.name,
      items: orderItems,
      subtotal,
      gstAmount,
      total,
      status: "ORDER_PLACED",
      statusHistory: [
        {
          previousStatus: null,
          newStatus: "ORDER_PLACED",
          changedBy: req.user.id,
          changedByRole: "CUSTOMER",
          timestamp: new Date(),
        },
      ],
    });

    res.status(201).json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not create order", detail: err.message });
  }
});

// Customer's own orders
router.get("/", requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json({ orders });
});

// Single order (owner or admin)
router.get("/:id", requireAuth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (String(order.userId) !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Not your order" });
  }
  res.json({ order });
});

// ---- Admin ----

router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).populate("userId", "name phone email");
  res.json({ orders });
});

router.put("/admin/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const { status, note } = req.body;
  if (!ORDER_STATUS_LIST.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const previousStatus = order.status;
  order.status = status;
  order.statusHistory.push({
    previousStatus,
    newStatus: status,
    changedBy: req.user.id,
    changedByRole: "ADMIN",
    note,
    timestamp: new Date(),
  });
  await order.save();

  // NOTE: this is where a WhatsApp notification would be triggered in production,
  // e.g. sendWhatsAppTemplate(order, status) — stubbed out for this pilot.

  res.json({ order });
});

export default router;
