import express from "express";
import mongoose from "mongoose";
import Order, { ORDER_STATUS_LIST } from "../models/Order.js";
import Garment from "../models/Garment.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import LaundryPartner from "../models/LaundryPartner.js";
import Notification from "../models/Notification.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { advanceOrderStatus } from "../utils/orderStatus.js";
import { sendWhatsAppNotification } from "../services/whatsapp.js";
import { getBusinessSettings } from "../config/businessSettings.js";
import { releaseSlotReservation, reserveSlot, SlotBookingError } from "../utils/slotBooking.js";

const router = express.Router();

// Helper: Get flat price for a garment based on service code and speed
function getGarmentPrice(garment, serviceCode, speed) {
  const code = serviceCode.toUpperCase();
  const spd = speed.toUpperCase();

  if (code === "WASHING") {
    return garment.washingPrice || 0;
  }
  if (code === "DRY_CLEANING") {
    return garment.dryCleaningPrice || 0;
  }
  if (code === "IRONING") {
    if (spd === "EXPRESS") {
      return garment.ironingExpressPrice || 0;
    }
    return garment.ironingRegularPrice || 0;
  }
  return 0;
}

// Create order (customer)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { address, speed, items, serviceId, pickupSlot, deliverySlot } = req.body;
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

    const deliverySpeed = speed || "REGULAR";
    const settings = await getBusinessSettings();

    // Validate speed: EXPRESS only allowed for Ironing
    if (deliverySpeed === "EXPRESS" && service.code !== "IRONING") {
      return res.status(400).json({ error: "Express delivery is only available for Ironing service" });
    }
    if (deliverySpeed === "EXPRESS" && !settings.EXPRESS_IRONING_ENABLED) {
      return res.status(400).json({ error: "Express ironing is not currently available" });
    }

    const garmentIds = items.map((i) => i.garmentId);
    const garments = await Garment.find({ _id: { $in: garmentIds } });
    const garmentMap = new Map(garments.map((g) => [String(g._id), g]));

    let subtotal = 0;

    const orderItems = items.map((i) => {
      const garment = garmentMap.get(String(i.garmentId));
      if (!garment) throw new Error(`Unknown garment: ${i.garmentId}`);

      const unitPrice = getGarmentPrice(garment, service.code, deliverySpeed);

      if (unitPrice <= 0) {
        throw new Error(
          `${garment.name} is not available for ${service.name} ${deliverySpeed === "EXPRESS" ? "(Express)" : ""}`
        );
      }

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

    const minimumOrder = deliverySpeed === "EXPRESS" ? settings.EXPRESS_MIN_ORDER : settings.REGULAR_MIN_ORDER;
    if (subtotal < minimumOrder) {
      return res.status(400).json({
        error: `Minimum order for ${deliverySpeed === "EXPRESS" ? "express" : "standard"} service is ₹${minimumOrder}`,
        code: "MINIMUM_ORDER_NOT_MET",
        minimumOrder,
        subtotal,
      });
    }
    const taxEnabled = settings.TAX_ENABLED;
    const taxPercent = taxEnabled ? settings.TAX_PERCENT : 0;
    const gstAmount = Math.round(subtotal * taxPercent) / 100;
    const total = Math.round((subtotal + gstAmount) * 100) / 100;

    const orderData = {
      userId: req.user.id,
      address,
      speed: deliverySpeed,
      serviceId: service._id,
      serviceName: service.name,
      serviceCode: service.code,
      pickupSlot: pickupSlot || null,
      deliverySlot: deliverySlot || null,
      items: orderItems,
      subtotal,
      taxEnabled,
      taxLabel: settings.TAX_LABEL,
      taxPercent,
      gstAmount,
      minimumOrder,
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
    };

    if (deliverySpeed !== "EXPRESS" && !pickupSlot) {
      return res.status(400).json({ error: "Choose a pickup slot before placing your order", code: "PICKUP_SLOT_REQUIRED" });
    }
    if (deliverySpeed === "EXPRESS" && pickupSlot) {
      return res.status(400).json({ error: "Express ironing does not use a scheduled pickup slot", code: "SLOT_NOT_ALLOWED" });
    }

    const session = await mongoose.startSession();
    let order;
    try {
      await session.withTransaction(async () => {
        if (pickupSlot) await reserveSlot(pickupSlot, session);
        if (deliverySlot && String(deliverySlot) !== String(pickupSlot)) await reserveSlot(deliverySlot, session);
        [order] = await Order.create([orderData], { session });
      });
    } finally {
      await session.endSession();
    }

    res.status(201).json({ order });

    // fire-and-forget: don't block the response on the notification write
    sendWhatsAppNotification(order, "ORDER_PLACED").catch(() => {});

    // Notify admins of new order
    try {
      const admins = await User.find({ role: "ADMIN" });
      const notificationPromises = admins.map((admin) =>
        Notification.create({
          userId: admin._id,
          title: "New Order Received",
          message: `Order #${order._id.toString().slice(-6).toUpperCase()} from ${req.user.name || "a customer"} has arrived.`,
          type: "order_created",
          orderId: order._id,
        })
      );
      await Promise.all(notificationPromises);
    } catch (notifyError) {
      console.error("Failed to create admin notifications:", notifyError);
    }
  } catch (err) {
    const status = err instanceof SlotBookingError ? err.statusCode : 400;
    res.status(status).json({
      error: err.publicMessage || "Could not create order",
      code: err.code,
      detail: err.message,
    });
  }
});

// Customer's own orders
router.get("/", requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .populate("pickupSlot", "date timeRange maxOrders bookedCount");
  res.json({ orders });
});

// Single order (owner or admin) - FIXED
router.get("/:id", requireAuth, async (req, res) => {
  try {
    // Sanitize the ID - remove any quotes or whitespace
    const orderId = req.params.id.replace(/["'\s]/g, "");

    // Validate it's a proper MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const order = await Order.findById(orderId).populate("pickupSlot", "date timeRange maxOrders bookedCount");
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
    .populate("partnerId", "businessName phone")
    .populate("pickupSlot", "date timeRange maxOrders bookedCount");
  res.json({ orders });
});

// Admin status update - FIXED
router.put("/admin/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Sanitize the ID - remove any quotes or whitespace
    const orderId = req.params.id.replace(/["'\s]/g, "");

    // Validate it's a proper MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const { status, note } = req.body;
    if (!ORDER_STATUS_LIST.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    let order;
    let cancelledNow = false;
    if (status === "CANCELLED") {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          cancelledNow = false;
          order = await Order.findById(orderId).session(session);
          if (!order) return;
          if (order.status === "CANCELLED") return;
          if (order.status === "DELIVERED") throw new Error("Delivered orders cannot be cancelled");
          const previousStatus = order.status;
          order.status = "CANCELLED";
          order.statusHistory.push({
            previousStatus,
            newStatus: "CANCELLED",
            changedBy: req.user.id,
            changedByRole: "ADMIN",
            note,
            timestamp: new Date(),
          });
          if (!order.slotReservationReleasedAt) {
            await releaseSlotReservation(order.pickupSlot, session);
            if (order.deliverySlot && String(order.deliverySlot) !== String(order.pickupSlot)) {
              await releaseSlotReservation(order.deliverySlot, session);
            }
            order.slotReservationReleasedAt = new Date();
          }
          await order.save({ session });
          cancelledNow = true;
        });
      } finally {
        await session.endSession();
      }
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (cancelledNow) sendWhatsAppNotification(order, "CANCELLED").catch(() => {});
    } else {
      order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      await advanceOrderStatus(order, status, { userId: req.user.id, role: "ADMIN", note });
    }

    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not update order", detail: err.message });
  }
});

// Assign a rider - FIXED
router.put("/admin/:id/assign-rider", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Sanitize the ID - remove any quotes or whitespace
    const orderId = req.params.id.replace(/["'\s]/g, "");

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
    const orderId = req.params.id.replace(/["'\s]/g, "");

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

// Assign rider and set delivery method (STANDARD/EXPRESS) - NEW
router.put("/admin/:id/assign", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Sanitize the ID - remove any quotes or whitespace
    const orderId = req.params.id.replace(/["'\s]/g, "");

    // Validate it's a proper MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const { riderId, deliveryMethod } = req.body;

    // Validate deliveryMethod
    if (deliveryMethod && !["STANDARD", "EXPRESS"].includes(deliveryMethod)) {
      return res.status(400).json({ error: "Invalid delivery method. Must be STANDARD or EXPRESS" });
    }

    // If riderId is provided, validate rider exists
    let riderForNote = null;
    if (riderId) {
      riderForNote = await User.findOne({ _id: riderId, role: "RIDER" });
      if (!riderForNote) return res.status(404).json({ error: "Rider not found" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Update riderId and deliveryMethod
    if (riderId !== undefined) order.riderId = riderId;
    if (deliveryMethod !== undefined) order.deliveryMethod = deliveryMethod;

    await order.save();

    // If order was just placed and now has a rider, advance status to PICKUP_ASSIGNED
    if (order.status === "ORDER_PLACED" && riderId) {
      await advanceOrderStatus(order, "PICKUP_ASSIGNED", {
        userId: req.user.id,
        role: "ADMIN",
        note: `Rider assigned: ${riderForNote ? riderForNote.name : "Unassigned"}`,
      });
    }

    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: "Could not assign rider", detail: err.message });
  }
});

export default router;
