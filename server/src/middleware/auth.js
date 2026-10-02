import jwt from "jsonwebtoken";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { default: User } = await import("../models/User.js");
    const account = await User.findById(payload.id).select("role +sessionVersion").lean();
    if (!account || Number(payload.sv || 0) !== Number(account.sessionVersion || 0)) {
      return res.status(401).json({ error: "This session has been revoked. Sign in again.", code: "SESSION_REVOKED" });
    }
    req.user = { ...payload, role: account.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    if (req.user?.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });
    try {
      const { default: User } = await import("../models/User.js");
      const admin = await User.findById(req.user.id).select("adminPermissions").lean();
      // Existing admins with no permissions remain full administrators until scoped.
      if (!admin || (admin.adminPermissions?.length && !admin.adminPermissions.includes(permission))) {
        return res.status(403).json({ error: `Missing admin permission: ${permission}` });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(" or ")}` });
    }
    next();
  };
}
