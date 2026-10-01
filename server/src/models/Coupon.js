import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 30 },
  description: { type: String, trim: true, maxlength: 160, default: "" },
  discountType: { type: String, enum: ["FLAT", "PERCENT"], default: "FLAT" },
  discountValue: { type: Number, min: 0, required: true },
  maxDiscount: { type: Number, min: 0, default: 0 },
  minimumOrder: { type: Number, min: 0, default: 0 },
  usageLimit: { type: Number, min: 0, default: 0 },
  usedCount: { type: Number, min: 0, default: 0 },
  perCustomerLimit: { type: Number, min: 1, default: 1 },
  startsAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

export default mongoose.model("Coupon", couponSchema);
