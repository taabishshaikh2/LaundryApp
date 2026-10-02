import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { advanceOrderStatus } from "../utils/orderStatus.js";
import { actorDetails, handoverSummary, normalizeHandoverItems } from "../utils/handover.js";

const router = express.Router();

const deliveryOtpHash = (otp) => crypto.createHmac("sha256", process.env.JWT_SECRET).update(String(otp)).digest("hex");

router.use(requireAuth, requireRole("RIDER"));

// Statuses a rider is allowed to move an order into, forward-only.
const RIDER_ALLOWED_STATUSES = ["RIDER_ON_THE_WAY", "OUT_FOR_DELIVERY"];

router.get("/orders", async (req, res) => {
  const orders = await Order.find({ riderId: req.user.id })
    .sort({ createdAt: 1 })
    .populate("userId", "name phone").populate("pickupSlot deliverySlot");
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

router.post("/orders/:id/delivery-proof", async (req, res) => {
  try {
    const orderId = req.params.id.replace(/["'\s]/g, "");
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ error: "Invalid order ID format" });
    const order = await Order.findOne({ _id: orderId, riderId: req.user.id }).select("+deliveryProof.otpHash");
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "OUT_FOR_DELIVERY") return res.status(409).json({ error: "Start delivery before recording proof" });
    if (!order.deliveryProof?.otpHash || !order.deliveryProof.otpExpiresAt) {
      return res.status(409).json({ error: "Ask the customer to generate a delivery code from their order page" });
    }
    if (new Date(order.deliveryProof.otpExpiresAt) < new Date()) return res.status(400).json({ error: "Delivery code expired. Ask the customer for a new code" });
    if (order.deliveryProof.otpFailedAttempts >= 5) return res.status(429).json({ error: "Too many incorrect attempts. Ask the customer to generate a new code" });
    const otpHash = deliveryOtpHash(String(req.body.otp || "").trim());
    if (otpHash !== order.deliveryProof.otpHash) {
      order.deliveryProof.otpFailedAttempts += 1;
      await order.save();
      return res.status(400).json({ error: "Incorrect delivery code" });
    }

    const recipientName = String(req.body.recipientName || "").trim();
    const deliveredGarmentCount = Number(req.body.deliveredGarmentCount);
    const expectedGarmentCount = (order.handover?.items || []).reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
    const missingOrDamagedNotes = String(req.body.missingOrDamagedNotes || "").trim();
    if (recipientName.length < 2) return res.status(400).json({ error: "Recipient name is required" });
    if (!Number.isInteger(deliveredGarmentCount) || deliveredGarmentCount < 0 || deliveredGarmentCount > expectedGarmentCount) {
      return res.status(400).json({ error: `Delivered garment count must be between 0 and ${expectedGarmentCount}` });
    }
    if (deliveredGarmentCount !== expectedGarmentCount && missingOrDamagedNotes.length < 3) {
      return res.status(400).json({ error: "Explain any missing or damaged garments" });
    }
    const photoDataUrl = String(req.body.photo?.dataUrl || "");
    if (photoDataUrl && (!/^data:image\/(jpeg|png|webp);base64,/.test(photoDataUrl) || photoDataUrl.length > 2_000_000)) {
      return res.status(400).json({ error: "Delivery photo must be JPG, PNG, or WebP and under about 1.5 MB" });
    }
    const collectedAmount = Number(req.body.collectedAmount || 0);
    if (!Number.isFinite(collectedAmount) || collectedAmount < 0) return res.status(400).json({ error: "Invalid collected amount" });
    const cashCollected = Boolean(req.body.cashCollected);
    if (order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "UNPAID" && !cashCollected) {
      return res.status(400).json({ error: "Confirm cash collection before completing this COD delivery" });
    }
    if (cashCollected && collectedAmount < Number(order.total || 0)) {
      return res.status(400).json({ error: `Record the full ₹${order.total} collected amount` });
    }
    const lat = req.body.location?.lat === "" || req.body.location?.lat == null ? null : Number(req.body.location.lat);
    const lng = req.body.location?.lng === "" || req.body.location?.lng == null ? null : Number(req.body.location.lng);
    const locationAddress = String(req.body.location?.address || "").trim();
    if ((lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) || (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180))) {
      return res.status(400).json({ error: "Invalid delivery location" });
    }
    if ((lat === null || lng === null) && locationAddress.length < 3) {
      return res.status(400).json({ error: "Capture the delivery location or enter a location note" });
    }
    const rider = await User.findById(req.user.id).select("name");
    const now = new Date();
    Object.assign(order.deliveryProof, {
      otpHash: "",
      verifiedAt: now,
      verifiedBy: req.user.id,
      verifiedByName: rider?.name || "Rider",
      recipientName,
      expectedGarmentCount,
      deliveredGarmentCount,
      missingOrDamagedNotes: missingOrDamagedNotes.slice(0, 1000),
      photo: photoDataUrl ? { dataUrl: photoDataUrl, caption: "Proof of delivery" } : null,
      cashCollected,
      collectedAmount,
      collectionMethod: String(req.body.collectionMethod || (cashCollected ? "CASH" : "")).trim().slice(0, 40),
      collectionReference: String(req.body.collectionReference || "").trim().slice(0, 120),
      location: { lat, lng, address: locationAddress.slice(0, 300) },
    });
    order.deliveryProof.auditTrail.push({
      action: "DELIVERY_VERIFIED",
      changedBy: req.user.id,
      changedByName: rider?.name || "Rider",
      changedByRole: "RIDER",
      note: `${deliveredGarmentCount}/${expectedGarmentCount} garments delivered to ${recipientName}`,
      timestamp: now,
    });
    if (cashCollected) order.paymentStatus = "PAID";
    await order.save();
    await advanceOrderStatus(order, "DELIVERED", { userId: req.user.id, role: "RIDER", note: "OTP verified; proof of delivery recorded" });
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not complete delivery" });
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
