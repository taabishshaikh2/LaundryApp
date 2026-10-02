import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema({
  payeeType: { type: String, enum: ["RIDER", "PARTNER"], required: true },
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "LaundryPartner", default: null },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  grossOrderValue: { type: Number, min: 0, default: 0 },
  commissionType: { type: String, enum: ["PERCENT", "FLAT_PER_ORDER"], default: "PERCENT" },
  commissionRate: { type: Number, min: 0, default: 0 },
  amount: { type: Number, min: 0, required: true },
  status: { type: String, enum: ["DRAFT", "APPROVED", "PAID"], default: "DRAFT" },
  paidAt: { type: Date, default: null },
  paymentReference: { type: String, trim: true, maxlength: 120, default: "" },
  notes: { type: String, trim: true, maxlength: 500, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

payoutSchema.index({ payeeType: 1, periodStart: -1, periodEnd: -1 });
export default mongoose.model("Payout", payoutSchema);
