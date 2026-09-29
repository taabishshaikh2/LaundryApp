import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import Slot from "../models/Slot.js";
import { getBusinessSettings } from "../config/businessSettings.js";

const router = express.Router();

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const slots = await Slot.find({});
  res.json({ slots });
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { date, timeRange, maxOrders } = req.body;
  const settings = await getBusinessSettings();
  const capacity = maxOrders === undefined || maxOrders === "" ? settings.DEFAULT_MAX_ORDERS : Number(maxOrders);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
    return res.status(400).json({ error: "Maximum orders must be a whole number between 1 and 1000" });
  }
  const slot = await Slot.create({ date, timeRange, maxOrders: capacity });
  res.status(201).json({ slot });
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const slot = await Slot.findByIdAndUpdate(id, data, { new: true });
  res.json({ slot });
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await Slot.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
