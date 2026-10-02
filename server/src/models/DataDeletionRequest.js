import mongoose from "mongoose";

const dataDeletionRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  reason: { type: String, trim: true, maxlength: 500, default: "" },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"], default: "PENDING" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, trim: true, maxlength: 500, default: "" },
}, { timestamps: true });

export default mongoose.model("DataDeletionRequest", dataDeletionRequestSchema);
