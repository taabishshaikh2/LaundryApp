import express from "express";
import mongoose from "mongoose";
import Order, { ORDER_STATUS_LIST } from "../models/Order.js";
import Garment from "../models/Garment.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import LaundryPartner from "../models/LaundryPartner.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { advanceOrderStatus } from "../utils/orderStatus.js";
import { sendWhatsAppNotification } from "../services/whatsapp.js";

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

    // fire-and-forget: don't block the response on the notification write
    sendWhatsAppNotification(order, "ORDER_PLACED").catch(() => {});
  } catch (err) {
    res.status(400).json({ error: "Could not create order", detail: err.message });
  }
});

// Customer's own orders
router.get("/", requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json({ orders });
});

// Single order (owner or admin) - FIXED
router.get("/:id", requireAuth, async (req, res) => {
  try {
    // Sanitize the ID - remove any quotes or whitespace
    const orderId = req.params.id.replace(/["'\s]/g, '');
    
    // Validate it's a proper MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }
    
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    
    if (String(order.userId) !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not your order" });
    }
    
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Invalid request", detail: err.message });
  }
});

// ---- Admin ----

router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .populate("userId", "name phone email")
    .populate("riderId", "name phone")
    .populate("partnerId", "businessName phone");
  res.json({ orders });
});

// Admin status update - FIXED
router.put("/admin/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Sanitize the ID - remove any quotes or whitespace
    const orderId = req.params.id.replace(/["'\s]/g, '');
    
    // Validate it's a proper MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }
    
    const { status, note } = req.body;
    if (!ORDER_STATUS_LIST.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    await advanceOrderStatus(order, status, { userId: req.user.id, role: "ADMIN", note });

    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not update order", detail: err.message });
  }
});

// Assign a rider - FIXED
router.put("/admin/:id/assign-rider", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Sanitize the ID - remove any quotes or whitespace
    const orderId = req.params.id.replace(/["'\s]/g, '');
    
    // Validate it's a proper MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }
    
    const { riderId } = req.body;
    const rider = await User.findOne({ _id: riderId, role: "RIDER" });
    if (!rider) return res.status(404).json({ error: "Rider not found" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.riderId = rider._id;
    await order.save();

    if (order.status === "ORDER_PLACED") {
      await advanceOrderStatus(order, "PICKUP_ASSIGNED", {
        userId: req.user.id,
        role: "ADMIN",
        note: `Rider assigned: ${rider.name}`,
      });
    }

    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not assign rider", detail: err.message });
  }
});

// Assign a laundry partner - FIXED
router.put("/admin/:id/assign-partner", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Sanitize the ID - remove any quotes or whitespace
    const orderId = req.params.id.replace(/["'\s]/g, '');
    
    // Validate it's a proper MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }
    
    const { partnerId } = req.body;
    const partner = await LaundryPartner.findById(partnerId);
    if (!partner) return res.status(404).json({ error: "Laundry partner not found" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.partnerId = partner._id;
    await order.save();

    if (order.status === "PICKED_UP") {
      await advanceOrderStatus(order, "PROCESSING", {
        userId: req.user.id,
        role: "ADMIN",
        note: `Laundry partner assigned: ${partner.businessName}`,
      });
    }

    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not assign partner", detail: err.message });
  }
});

export default router;