import express from "express";
import Service from "../models/Service.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const services = await Service.find({ active: true }).sort({ createdAt: 1 });
  res.json({ services });
});

export default router;
