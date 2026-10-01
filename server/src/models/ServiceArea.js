import mongoose from "mongoose";

const serviceAreaSchema = new mongoose.Schema({
  pincode: { type: String, required: true, unique: true, trim: true, match: /^\d{6}$/ },
  areaName: { type: String, required: true, trim: true, maxlength: 100 },
  city: { type: String, default: "Mumbai", trim: true, maxlength: 60 },
  deliveryCharge: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("ServiceArea", serviceAreaSchema);
