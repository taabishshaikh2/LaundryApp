import mongoose from "mongoose";

const SlotSchema = new mongoose.Schema({
  type: { type: String, enum: ["PICKUP", "DELIVERY"], default: "PICKUP", index: true },
  date: { type: Date, required: true },          // e.g., 2026‑10‑01
  timeRange: { type: String, required: true },   // e.g., "09:00-11:00"
  maxOrders: { type: Number, default: 5, min: 1 },
  bookedCount: { type: Number, default: 0, min: 0 },
});

SlotSchema.index({ type: 1, date: 1, timeRange: 1 }, { unique: true });

export default mongoose.model("Slot", SlotSchema);
