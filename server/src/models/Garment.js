import mongoose from "mongoose";

const garmentSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["MEN", "WOMEN", "KIDS", "HOUSEHOLD"], required: true },
    name: { type: String, required: true },
    icon: { type: String, default: "👕" },
    unit: { type: String, default: "piece" },
    priceRegular: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Garment", garmentSchema);
