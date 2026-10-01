import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorRole: { type: String, default: "SYSTEM" },
  action: { type: String, required: true, trim: true, maxlength: 100 },
  entityType: { type: String, trim: true, maxlength: 80, default: "" },
  entityId: { type: String, trim: true, maxlength: 80, default: "" },
  ip: { type: String, trim: true, maxlength: 80, default: "" },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
auditLogSchema.index({ createdAt: -1, action: 1 });
export default mongoose.model("AuditLog", auditLogSchema);
