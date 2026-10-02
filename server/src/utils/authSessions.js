import crypto from "crypto";
import jwt from "jsonwebtoken";
import AuthSession from "../models/AuthSession.js";

const ACCESS_MINUTES = Math.max(5, Number(process.env.ACCESS_TOKEN_MINUTES || 20));
const REFRESH_DAYS = Math.max(1, Number(process.env.REFRESH_TOKEN_DAYS || 30));
export const hashToken = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

export function signAccessToken(user) {
  return jwt.sign({ id: user._id, role: user.role, sv: Number(user.sessionVersion || 0) }, process.env.JWT_SECRET, { expiresIn: `${ACCESS_MINUTES}m` });
}

export async function createSession(user, req, familyId = crypto.randomUUID()) {
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  await AuthSession.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    familyId,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    ip: String(req.ip || "").slice(0, 80),
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000),
  });
  return { token: signAccessToken(user), refreshToken, expiresInMinutes: ACCESS_MINUTES };
}

export async function rotateSession(refreshToken, req) {
  const tokenHash = hashToken(refreshToken);
  const session = await AuthSession.findOne({ tokenHash });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    if (session?.familyId) await AuthSession.updateMany({ familyId: session.familyId, revokedAt: null }, { revokedAt: new Date() });
    throw new Error("Refresh session is invalid or has expired");
  }
  const { default: User } = await import("../models/User.js");
  const user = await User.findById(session.userId).select("+sessionVersion");
  if (!user) throw new Error("Account no longer exists");
  const next = await createSession(user, req, session.familyId);
  session.revokedAt = new Date();
  session.replacedByHash = hashToken(next.refreshToken);
  await session.save();
  return { ...next, user };
}

export async function revokeSession(refreshToken) {
  if (!refreshToken) return;
  await AuthSession.updateOne({ tokenHash: hashToken(refreshToken), revokedAt: null }, { revokedAt: new Date() });
}

export async function revokeAllSessions(userId) {
  await AuthSession.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}
