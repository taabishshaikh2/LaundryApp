import express from "express";
import Slot from "../models/Slot.js";

const router = express.Router();

// GET /api/slots - public endpoint, no auth required
router.get("/", async (req, res) => {
  try {
    const slots = await Slot.find({}).sort({ date: 1, timeRange: 1 });
    res.json({ slots });
  } catch (err) {
    console.error("Error fetching slots:", err);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

export default router;
