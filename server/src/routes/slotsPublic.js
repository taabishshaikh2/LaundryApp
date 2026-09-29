import express from "express";
import Slot from "../models/Slot.js";
import { isSlotInFuture, startOfBusinessToday } from "../utils/slotBooking.js";

const router = express.Router();

// GET /api/slots - public endpoint, no auth required
router.get("/", async (req, res) => {
  try {
    const candidates = await Slot.find({ date: { $gte: startOfBusinessToday() } }).sort({ date: 1, timeRange: 1 });
    const slots = candidates.filter((slot) => isSlotInFuture(slot));
    res.json({ slots });
  } catch (err) {
    console.error("Error fetching slots:", err);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

export default router;
