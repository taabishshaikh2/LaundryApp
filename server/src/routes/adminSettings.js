import express from "express";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import Settings from "../models/Settings.js";
import { getBusinessSettings, validateBusinessSettings } from "../config/businessSettings.js";

const router = express.Router();

router.get("/", requireAuth, requirePermission("SETTINGS"), async (req, res) => {
  try {
    res.json({ settings: await getBusinessSettings() });
  } catch (error) {
    res.status(500).json({ error: "Could not load settings", detail: error.message });
  }
});

router.put("/", requireAuth, requirePermission("SETTINGS"), async (req, res) => {
  try {
    const settings = validateBusinessSettings(req.body?.settings ?? req.body);
    const now = new Date();
    await Settings.bulkWrite(Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { value, updatedBy: req.user.id, updatedAt: now }, $setOnInsert: { createdAt: now } },
        upsert: true,
      },
    })));
    res.json({ settings });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not save settings" });
  }
});

export default router;
