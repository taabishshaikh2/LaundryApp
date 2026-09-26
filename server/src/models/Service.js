import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true }, // e.g. WASHING, IRONING, DRY_CLEANING
    icon: { type: String, default: "🧺" },
    description: String,
    hasExpressOption: { type: Boolean, default: false }, // true for IRONING only
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);
