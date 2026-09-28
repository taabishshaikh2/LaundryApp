import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import Slot from "../models/Slot.js";

const router = express.Router();

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const slots = await Slot.find({});
  res.json({ slots });
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { date, timeRange, maxOrders } = req.body;
  const slot = await Slot.create({ date, timeRange, maxOrders });
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