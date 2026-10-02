import express from "express";
import mongoose from "mongoose";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import Slot from "../models/Slot.js";
import { getBusinessSettings } from "../config/businessSettings.js";
import { startOfBusinessToday } from "../utils/slotBooking.js";

const router = express.Router();
const TIME_RANGE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

function parseSlotInput({ date, timeRange, maxOrders, type }, defaultCapacity) {
  const parsedDate = new Date(date);
  if (!date || Number.isNaN(parsedDate.getTime())) throw new Error("Choose a valid pickup date");
  if (parsedDate < startOfBusinessToday()) throw new Error("Pickup slots cannot be created in the past");
  if (!TIME_RANGE.test(timeRange || "")) throw new Error("Time range must use HH:MM-HH:MM format");
  const [start, end] = timeRange.split("-");
  if (end <= start) throw new Error("Slot end time must be later than its start time");
  const capacity = maxOrders === undefined || maxOrders === "" ? defaultCapacity : Number(maxOrders);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
    throw new Error("Maximum orders must be a whole number between 1 and 1000");
  }
  const slotType = String(type || "PICKUP").toUpperCase();
  if (!["PICKUP", "DELIVERY"].includes(slotType)) throw new Error("Choose pickup or delivery slot");
  return { date: parsedDate, timeRange, maxOrders: capacity, type: slotType };
}

router.get("/", requireAuth, requirePermission("OPERATIONS"), async (req, res) => {
  try {
    res.json({ slots: await Slot.find({}).sort({ date: 1, timeRange: 1 }) });
  } catch (error) {
    res.status(500).json({ error: "Could not load pickup slots" });
  }
});

router.post("/", requireAuth, requirePermission("OPERATIONS"), async (req, res) => {
  try {
    const settings = await getBusinessSettings();
    const input = parseSlotInput(req.body, settings.DEFAULT_MAX_ORDERS);
    const duplicate = await Slot.findOne({ type: input.type, date: input.date, timeRange: input.timeRange });
    if (duplicate) return res.status(409).json({ error: `A ${input.type.toLowerCase()} slot already exists for this date and time` });
    res.status(201).json({ slot: await Slot.create(input) });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not create pickup slot" });
  }
});

router.put("/:id", requireAuth, requirePermission("OPERATIONS"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid slot ID" });
    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: "Pickup slot not found" });
    const settings = await getBusinessSettings();
    const input = parseSlotInput({
      date: req.body.date ?? slot.date,
      timeRange: req.body.timeRange ?? slot.timeRange,
      maxOrders: req.body.maxOrders ?? slot.maxOrders,
      type: req.body.type ?? slot.type,
    }, settings.DEFAULT_MAX_ORDERS);
    if (input.maxOrders < slot.bookedCount) {
      return res.status(409).json({ error: `Capacity cannot be lower than the ${slot.bookedCount} existing bookings` });
    }
    if (slot.bookedCount > 0 && (input.date.getTime() !== slot.date.getTime() || input.timeRange !== slot.timeRange || input.type !== slot.type)) {
      return res.status(409).json({ error: "The date or time of a booked slot cannot be changed" });
    }
    Object.assign(slot, input);
    await slot.save();
    res.json({ slot });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not update pickup slot" });
  }
});

router.delete("/:id", requireAuth, requirePermission("OPERATIONS"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid slot ID" });
    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: "Pickup slot not found" });
    if (slot.bookedCount > 0) return res.status(409).json({ error: "A slot with existing bookings cannot be deleted" });
    await slot.deleteOne();
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not delete pickup slot" });
  }
});

export default router;
