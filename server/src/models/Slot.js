import mongoose from "mongoose";

const SlotSchema = new mongoose.Schema({
  date: { type: Date, required: true },          // e.g., 2026‑10‑01
  timeRange: { type: String, required: true },   // e.g., "09:00-11:00"
  maxOrders: { type: Number, default: 5 },
  bookedCount: { type: Number, default: 0 },
});

export default mongoose.model("Slot", SlotSchema);