import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "LaundryPartner", default: null },
  overall: { type: Number, min: 1, max: 5, required: true },
  riderScore: { type: Number, min: 1, max: 5, default: null },
  partnerScore: { type: Number, min: 1, max: 5, default: null },
  comment: { type: String, trim: true, maxlength: 700, default: "" },
}, { timestamps: true });

export default mongoose.model("Rating", ratingSchema);
