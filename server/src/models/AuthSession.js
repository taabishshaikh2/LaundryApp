import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  familyId: { type: String, required: true, index: true },
  userAgent: { type: String, maxlength: 300, default: "" },
  ip: { type: String, maxlength: 80, default: "" },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
  replacedByHash: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("AuthSession", authSessionSchema);
