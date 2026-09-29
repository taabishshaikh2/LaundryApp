import express from "express";
import { getBusinessSettings, getPublicBusinessSettings } from "../config/businessSettings.js";

const router = express.Router();
router.get("/", async (req, res) => {
  try {
    res.json({ settings: getPublicBusinessSettings(await getBusinessSettings()) });
  } catch (error) {
    console.error("Failed to load public settings:", error);
    res.status(500).json({ error: "Could not load business settings" });
  }
});
export default router;
