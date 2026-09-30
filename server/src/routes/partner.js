import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import LaundryPartner from "../models/LaundryPartner.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { advanceOrderStatus } from "../utils/orderStatus.js";
import { actorDetails } from "../utils/handover.js";
import { handoverReceivedCount, initializeProcessing, nextProcessingStage, normalizeProcessingPhotos, processingIsReady } from "../utils/processingWorkflow.js";

const router = express.Router();
router.use(requireAuth, requireRole("LAUNDRY_PARTNER"));

async function getOwnPartner(req, res) {
  const partner = await LaundryPartner.findOne({ userId: req.user.id });
  if (!partner) { res.status(404).json({ error: "No laundry partner profile linked to this account" }); return null; }
  return partner;
}

function cleanOrderId(raw) {
  const orderId = String(raw || "").replace(/["'\s]/g, "");
  return mongoose.Types.ObjectId.isValid(orderId) ? orderId : null;
}

async function getPartnerOrder(req, res) {
  const orderId = cleanOrderId(req.params.id);
  if (!orderId) { res.status(400).json({ error: "Invalid order ID format" }); return null; }
  const partner = await getOwnPartner(req, res);
  if (!partner) return null;
  const order = await Order.findOne({ _id: orderId, partnerId: partner._id });
  if (!order) { res.status(404).json({ error: "Order not found" }); return null; }
  return order;
}

router.get("/orders", async (req, res) => {
  const partner = await getOwnPartner(req, res);
  if (!partner) return;
  const orders = await Order.find({ partnerId: partner._id }).sort({ createdAt: 1 }).populate("userId", "name phone");
  res.json({ orders });
});

router.post("/orders/:id/intake", async (req, res) => {
  try {
    const order = await getPartnerOrder(req, res);
    if (!order) return;
    if (order.status !== "PROCESSING") return res.status(409).json({ error: "This order is not ready for laundry intake" });
    const verifiedQuantity = Number(req.body.verifiedQuantity);
    const bagCount = Number(req.body.bagCount || 1);
    if (!Number.isInteger(verifiedQuantity) || verifiedQuantity < 0 || verifiedQuantity > 500) return res.status(400).json({ error: "Verified quantity must be a whole number" });
    if (!Number.isInteger(bagCount) || bagCount < 1 || bagCount > 50) return res.status(400).json({ error: "Bag count must be between 1 and 50" });
    const expectedQuantity = handoverReceivedCount(order);
    const discrepancyNote = String(req.body.discrepancyNote || "").trim().slice(0, 500);
    const matched = verifiedQuantity === expectedQuantity;
    if (!matched && discrepancyNote.length < 3) return res.status(400).json({ error: "Explain the intake quantity difference" });
    initializeProcessing(order);
    const actor = await actorDetails(req.user.id, "LAUNDRY_PARTNER");
    order.processing.intake.status = matched ? "MATCHED" : "DISCREPANCY";
    order.processing.intake.bagCount = bagCount;
    order.processing.intake.expectedQuantity = expectedQuantity;
    order.processing.intake.verifiedQuantity = verifiedQuantity;
    order.processing.intake.discrepancyNote = discrepancyNote;
    order.processing.intake.confirmedAt = new Date();
    order.processing.intake.confirmedBy = req.user.id;
    order.processing.intake.confirmedByName = actor.changedByName;
    order.processing.auditTrail.push({ ...actor, action: matched ? "INTAKE_MATCHED" : "INTAKE_DISCREPANCY", note: matched ? `${verifiedQuantity} garments in ${bagCount} bag(s)` : `${verifiedQuantity} received; ${expectedQuantity} expected. ${discrepancyNote}`, timestamp: new Date() });
    await order.save();
    res.json({ order });
  } catch (err) { res.status(400).json({ error: err.message || "Could not confirm intake" }); }
});

router.post("/orders/:id/processing-stage", async (req, res) => {
  try {
    const order = await getPartnerOrder(req, res);
    if (!order) return;
    if (order.status !== "PROCESSING") return res.status(409).json({ error: "This order is not currently processing" });
    initializeProcessing(order);
    if (order.processing.intake.status !== "MATCHED") return res.status(409).json({ error: "Confirm a matching laundry intake before starting processing" });
    const stageName = String(req.body.stage || "").toUpperCase();
    const action = String(req.body.action || "").toUpperCase();
    if (stageName === "QUALITY_CHECK") return res.status(400).json({ error: "Use the quality-check action for this stage" });
    if (!["START", "COMPLETE"].includes(action)) return res.status(400).json({ error: "Choose START or COMPLETE" });
    const current = nextProcessingStage(order);
    if (!current || current.stage !== stageName) return res.status(409).json({ error: `Complete ${current?.stage?.replaceAll("_", " ") || "the current workflow"} first` });
    const actor = await actorDetails(req.user.id, "LAUNDRY_PARTNER");
    const note = String(req.body.note || "").trim().slice(0, 500);
    const issueType = String(req.body.issueType || "").toUpperCase();
    const issueNote = String(req.body.issueNote || "").trim().slice(0, 500);
    if (issueType && issueNote.length < 3) return res.status(400).json({ error: "Describe the processing issue" });
    const photos = normalizeProcessingPhotos(req.body.photos);
    if (action === "START") {
      current.status = "IN_PROGRESS";
      current.startedAt ||= new Date();
    } else {
      if (current.status !== "IN_PROGRESS") return res.status(409).json({ error: "Start this stage before completing it" });
      if (stageName === "PACKING" && order.processing.qualityCheck.status !== "PASSED") return res.status(409).json({ error: "Quality check must pass before packing" });
      current.status = "COMPLETED";
      current.completedAt = new Date();
    }
    current.updatedBy = req.user.id;
    current.updatedByName = actor.changedByName;
    current.note = note;
    current.issueType = issueType;
    current.issueNote = issueNote;
    if (photos.length) current.photos = photos;
    order.processing.auditTrail.push({ ...actor, action: action === "START" ? "STAGE_STARTED" : "STAGE_COMPLETED", stage: stageName, note: issueNote || note, timestamp: new Date() });
    await order.save();
    res.json({ order });
  } catch (err) { res.status(400).json({ error: err.message || "Could not update processing stage" }); }
});

router.post("/orders/:id/quality-check", async (req, res) => {
  try {
    const order = await getPartnerOrder(req, res);
    if (!order) return;
    if (order.status !== "PROCESSING") return res.status(409).json({ error: "This order is not currently processing" });
    initializeProcessing(order);
    if (order.processing.intake.status !== "MATCHED") return res.status(409).json({ error: "Confirm intake first" });
    const current = nextProcessingStage(order);
    if (!current || current.stage !== "QUALITY_CHECK") return res.status(409).json({ error: `Complete ${current?.stage?.replaceAll("_", " ") || "earlier stages"} first` });
    const result = String(req.body.result || "").toUpperCase();
    if (!["PASS", "FAIL"].includes(result)) return res.status(400).json({ error: "Choose PASS or FAIL" });
    const notes = String(req.body.notes || "").trim().slice(0, 1000);
    if (result === "FAIL" && notes.length < 3) return res.status(400).json({ error: "Explain why quality check failed" });
    const photos = normalizeProcessingPhotos(req.body.photos);
    const actor = await actorDetails(req.user.id, "LAUNDRY_PARTNER");
    order.processing.qualityCheck.status = result === "PASS" ? "PASSED" : "FAILED";
    order.processing.qualityCheck.notes = notes;
    order.processing.qualityCheck.photos = photos;
    order.processing.qualityCheck.checkedAt = new Date();
    order.processing.qualityCheck.checkedBy = req.user.id;
    order.processing.qualityCheck.checkedByName = actor.changedByName;
    current.status = result === "PASS" ? "COMPLETED" : "FAILED";
    current.startedAt ||= new Date();
    current.completedAt = result === "PASS" ? new Date() : null;
    current.updatedBy = req.user.id;
    current.updatedByName = actor.changedByName;
    current.note = notes;
    current.photos = photos;
    order.processing.auditTrail.push({ ...actor, action: `QUALITY_${result === "PASS" ? "PASSED" : "FAILED"}`, stage: "QUALITY_CHECK", note: notes, timestamp: new Date() });
    await order.save();
    res.json({ order });
  } catch (err) { res.status(400).json({ error: err.message || "Could not save quality check" }); }
});

router.put("/orders/:id/status", async (req, res) => {
  try {
    const order = await getPartnerOrder(req, res);
    if (!order) return;
    if (req.body.status !== "READY") return res.status(400).json({ error: "Laundry partners can only mark an order READY" });
    if (order.status !== "PROCESSING") return res.status(409).json({ error: "Only a processing order can be marked ready" });
    if (!processingIsReady(order)) return res.status(409).json({ error: "Complete intake, all processing stages, quality check, and packing first" });
    await advanceOrderStatus(order, "READY", { userId: req.user.id, role: "LAUNDRY_PARTNER", note: "Processing and quality control completed" });
    res.json({ order });
  } catch (err) { res.status(400).json({ error: err.message || "Could not mark order ready" }); }
});

router.post("/orders/:id/notes", async (req, res) => {
  try {
    const order = await getPartnerOrder(req, res);
    if (!order) return;
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "Note text is required" });
    order.notes.push({ text: text.slice(0, 500), addedBy: req.user.id, addedByRole: "LAUNDRY_PARTNER", timestamp: new Date() });
    await order.save();
    res.json({ order });
  } catch (err) { res.status(400).json({ error: err.message || "Could not add note" }); }
});

export default router;
