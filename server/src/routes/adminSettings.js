import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import Settings from "../models/Settings.js";

const router = express.Router();

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const settings = await Settings.find({});
  res.json({ settings });
});

router.put("/", requireAuth, requireAdmin, async (req, res) => {
  const { key, value } = req.body;
  const setting = await Settings.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );
  res.json({ setting });
});

export default router;