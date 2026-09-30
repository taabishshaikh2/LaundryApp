import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
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
import { reserveSlot, SlotBookingError } from "../utils/slotBooking.js";
import { actorDetails, handoverSummary, normalizeHandoverItems } from "../utils/handover.js";
import { cancelOrder, REFUND_STATUSES } from "../utils/orderCancellation.js";
import { buildPricingRevision, handoverHasDifferences, latestPricingRevision, pricingIsResolved } from "../utils/pricingRevision.js";
import { initializeProcessing, processingIsReady } from "../utils/processingWorkflow.js";

const router = express.Router();

const deliveryOtpHash = (otp) => crypto.createHmac("sha256", process.env.JWT_SECRET).update(String(otp)).digest("hex");

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

// Customer cancellation is allowed until the rider confirms physical pickup.
router.post("/:id/cancel", requireAuth, async (req, res) => {
  const orderId = req.params.id.replace(/["'\s]/g, "");
  if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ error: "Invalid order ID format" });
  const session = await mongoose.startSession();
  try {
    let order;
    let cancelledNow = false;
    await session.withTransaction(async () => {
      order = await Order.findOne({ _id: orderId, userId: req.user.id }).session(session);
      if (!order) return;
      cancelledNow = await cancelOrder(order, { userId: req.user.id, role: "CUSTOMER", reason: req.body.reason, session });
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (cancelledNow) sendWhatsAppNotification(order, "CANCELLED").catch(() => {});
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not cancel order" });
  } finally {
    await session.endSession();
  }
});

router.post("/:id/pricing-revision/respond", requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id.replace(/["'\s]/g, "");
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ error: "Invalid order ID format" });
    const order = await Order.findOne({ _id: orderId, userId: req.user.id });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status === "CANCELLED") return res.status(409).json({ error: "A cancelled order cannot approve a revised bill" });
    if (order.status !== "PICKED_UP") return res.status(409).json({ error: "This revised bill can only be answered before processing starts" });
    const revision = latestPricingRevision(order);
    if (!revision || revision.status !== "PENDING_CUSTOMER") return res.status(409).json({ error: "There is no revised bill awaiting your response" });
    if (new Date(revision.handoverUpdatedAt).getTime() < new Date(order.handover.lastUpdatedAt).getTime()) {
      return res.status(409).json({ error: "The handover changed after this bill was prepared. Ask the admin for a new revision" });
    }
    const response = String(req.body.response || "").toUpperCase();
    if (!["APPROVE", "REJECT"].includes(response)) return res.status(400).json({ error: "Choose approve or reject" });
    const responseNote = String(req.body.note || "").trim().slice(0, 500);
    if (response === "REJECT" && responseNote.length < 3) return res.status(400).json({ error: "Please explain why the revised bill is being rejected" });
    const actor = await actorDetails(req.user.id, "CUSTOMER");
    revision.status = response === "APPROVE" ? "APPROVED" : "REJECTED";
    revision.respondedAt = new Date();
    revision.responseNote = responseNote;
    revision.auditTrail.push({ ...actor, action: revision.status, note: responseNote, timestamp: revision.respondedAt });
    if (response === "APPROVE") {
      order.subtotal = revision.revisedSubtotal;
      order.gstAmount = revision.revisedTaxAmount;
      order.total = revision.revisedTotal;
      order.statusHistory.push({ previousStatus: order.status, newStatus: order.status, changedBy: req.user.id, changedByRole: "CUSTOMER", note: `Approved revised bill v${revision.version}: ₹${revision.revisedTotal}`, timestamp: revision.respondedAt });
    }
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not record the pricing response" });
  }
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

// A customer can generate or replace the delivery code while an order is ready or out for delivery.
router.post("/:id/delivery-otp", requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id.replace(/["'\s]/g, "");
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ error: "Invalid order ID format" });
    const order = await Order.findOne({ _id: orderId, userId: req.user.id }).select("+deliveryProof.otpHash");
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!["READY", "OUT_FOR_DELIVERY"].includes(order.status)) {
      return res.status(409).json({ error: "A delivery code is available once the order is ready" });
    }
    const otp = crypto.randomInt(100000, 1000000).toString();
    const now = new Date();
    order.deliveryProof.otpHash = deliveryOtpHash(otp);
    order.deliveryProof.otpGeneratedAt = now;
    order.deliveryProof.otpExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    order.deliveryProof.otpFailedAttempts = 0;
    const customer = await User.findById(req.user.id).select("name");
    order.deliveryProof.auditTrail.push({ action: "OTP_GENERATED", changedBy: req.user.id, changedByName: customer?.name || "Customer", changedByRole: "CUSTOMER", note: "Delivery verification code generated", timestamp: now });
    await order.save();
    res.json({ otp, expiresAt: order.deliveryProof.otpExpiresAt });
  } catch (err) {
    res.status(400).json({ error: "Could not generate delivery code", detail: err.message });
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
          cancelledNow = await cancelOrder(order, {
            userId: req.user.id,
            role: "ADMIN",
            reason: note || "Cancelled by administrator",
            session,
          });
        });
      } finally {
        await session.endSession();
      }
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (cancelledNow) sendWhatsAppNotification(order, "CANCELLED").catch(() => {});
    } else {
      order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (["PICKED_UP", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status) && !order.handover?.confirmedAt) {
        return res.status(409).json({ error: "Record and confirm the garment handover before moving this order beyond pickup" });
      }
      if (["PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status) && !pricingIsResolved(order)) {
        return res.status(409).json({ error: "The received garment count changed. Customer approval of the latest revised bill is required before processing" });
      }
      if (["READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status) && !processingIsReady(order)) {
        return res.status(409).json({ error: "Complete laundry intake, processing stages, quality check, and packing before marking this order ready" });
      }
      if (status === "DELIVERED" && !order.deliveryProof?.verifiedAt) {
        return res.status(409).json({ error: "Verified proof of delivery is required before completing this order" });
      }
      if (status === "PROCESSING") initializeProcessing(order);
      await advanceOrderStatus(order, status, { userId: req.user.id, role: "ADMIN", note });
    }

    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update order" });
  }
});

router.put("/admin/:id/handover", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id.replace(/["'\s]/g, "");
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ error: "Invalid order ID format" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (["CANCELLED", "DELIVERED"].includes(order.status)) return res.status(409).json({ error: "This order can no longer be changed" });
    const items = normalizeHandoverItems(req.body.items, order.items);
    const actor = await actorDetails(req.user.id, "ADMIN");
    const firstConfirmation = !order.handover?.confirmedAt;
    const now = new Date();
    order.handover.items = items;
    order.handover.generalNotes = String(req.body.generalNotes || "").trim().slice(0, 1000);
    order.handover.confirmedAt ||= now;
    order.handover.confirmedBy ||= req.user.id;
    order.handover.confirmedByName ||= actor.changedByName;
    order.handover.confirmedByRole ||= "ADMIN";
    order.handover.lastUpdatedAt = now;
    order.handover.auditTrail.push({ ...actor, action: firstConfirmation ? "CONFIRMED" : "UPDATED", summary: handoverSummary(items), timestamp: now });
    await order.save();
    if (firstConfirmation && ["PICKUP_ASSIGNED", "RIDER_ON_THE_WAY"].includes(order.status)) {
      await advanceOrderStatus(order, "PICKED_UP", { userId: req.user.id, role: "ADMIN", note: handoverSummary(items) });
    }
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not save handover" });
  }
});

router.put("/admin/:id/refund", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id.replace(/["'\s]/g, "");
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ error: "Invalid order ID format" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "CANCELLED") return res.status(409).json({ error: "Refund details can only be updated for cancelled orders" });
    const status = String(req.body.refundStatus || "");
    const amount = Number(req.body.refundAmount || 0);
    if (!REFUND_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid refund status" });
    if (!Number.isFinite(amount) || amount < 0 || amount > order.total) return res.status(400).json({ error: "Refund amount must be between ₹0 and the order total" });
    if (status === "PROCESSED" && !String(req.body.refundReference || "").trim()) {
      return res.status(400).json({ error: "Add a transaction or refund reference before marking processed" });
    }
    const actor = await actorDetails(req.user.id, "ADMIN");
    order.cancellation.refundStatus = status;
    order.cancellation.refundAmount = amount;
    order.cancellation.refundMethod = String(req.body.refundMethod || "").trim().slice(0, 60);
    order.cancellation.refundReference = String(req.body.refundReference || "").trim().slice(0, 120);
    order.cancellation.auditTrail.push({ ...actor, action: "REFUND_UPDATED", note: `${status}: ₹${amount}`, timestamp: new Date() });
    if (status === "PROCESSED") order.paymentStatus = amount >= order.total ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update refund" });
  }
});

router.post("/admin/:id/pricing-revision", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id.replace(/["'\s]/g, "");
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ error: "Invalid order ID format" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "PICKED_UP") return res.status(409).json({ error: "Revised bills can only be prepared after pickup and before processing" });
    if (!handoverHasDifferences(order)) return res.status(409).json({ error: "Ordered and received quantities already match" });
    const calculated = buildPricingRevision(order, req.body.lines);
    const actor = await actorDetails(req.user.id, "ADMIN");
    const version = (order.pricingRevisions?.length || 0) + 1;
    order.pricingRevisions.push({
      version,
      status: "PENDING_CUSTOMER",
      ...calculated,
      originalSubtotal: order.subtotal,
      originalTaxAmount: order.gstAmount,
      originalTotal: order.total,
      taxEnabled: order.taxEnabled,
      taxLabel: order.taxLabel,
      taxPercent: order.taxPercent,
      note: String(req.body.note || "").trim().slice(0, 500),
      handoverUpdatedAt: order.handover.lastUpdatedAt,
      createdAt: new Date(),
      createdBy: req.user.id,
      createdByName: actor.changedByName,
      auditTrail: [{ ...actor, action: "CREATED", note: String(req.body.note || "").trim().slice(0, 500), timestamp: new Date() }],
    });
    await order.save();
    res.status(201).json({ order, revision: latestPricingRevision(order) });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not create revised bill" });
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
      if (pricingIsResolved(order)) {
        initializeProcessing(order);
        await advanceOrderStatus(order, "PROCESSING", {
          userId: req.user.id,
          role: "ADMIN",
          note: `Laundry partner assigned: ${partner.businessName}`,
        });
      }
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
