import express from "express";
import Garment from "../models/Garment.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const garments = await Garment.find({ active: true }).sort({ category: 1, name: 1 });
  res.json({ garments });
});

export default router;
