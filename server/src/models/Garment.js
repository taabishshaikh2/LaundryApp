import mongoose from "mongoose";

const garmentSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["MEN", "WOMEN", "KIDS", "HOUSEHOLD"], required: true },
    name: { type: String, required: true },
    icon: { type: String, default: "👕" },
    unit: { type: String, default: "piece" },
    // Flat prices per service (0 or missing = not offered for that service)
    washingPrice: { type: Number, default: 0 },
    dryCleaningPrice: { type: Number, default: 0 },
    ironingRegularPrice: { type: Number, default: 0 },
    ironingExpressPrice: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Garment", garmentSchema);
