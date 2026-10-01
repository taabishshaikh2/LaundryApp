import AuditLog from "../models/AuditLog.js";

export async function writeAudit(req, action, entityType = "", entityId = "", details = {}) {
  const days = Math.max(30, Number(process.env.AUDIT_RETENTION_DAYS || 365));
  const expiresAt = new Date(Date.now() + days * 86400000);
  return AuditLog.create({ actorId: req.user?.id || null, actorRole: req.user?.role || "ANONYMOUS", action, entityType, entityId: String(entityId || ""), ip: req.ip || "", details, expiresAt });
}
