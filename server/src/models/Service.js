import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true }, // e.g. WASHING, IRONING, DRY_CLEANING
    icon: { type: String, default: "🧺" },
    description: String,
    priceMultiplier: { type: Number, default: 1 }, // applied on top of a garment's base price
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);
