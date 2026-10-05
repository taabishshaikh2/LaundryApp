import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import LaundryPartner from "../models/LaundryPartner.js";
import { requireAuth } from "../middleware/auth.js";
import crypto from "crypto";
import { rateLimit } from "../middleware/rateLimit.js";
import { writeAudit } from "../utils/audit.js";
import { deliverVerificationCode } from "../services/verificationDelivery.js";
import { createSession, rotateSession, revokeAllSessions, revokeSession } from "../utils/authSessions.js";
import { generateTotpSecret, protectTotpSecret, revealTotpSecret, verifyTotp } from "../utils/totp.js";
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from "../utils/authCookies.js";

const router = express.Router();

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    onboarding: user.onboarding,
    addresses: user.addresses,
    notificationPreferences: user.notificationPreferences,
    emailVerified: Boolean(user.emailVerifiedAt),
    phoneVerified: Boolean(user.phoneVerifiedAt),
    referralCode: user.referralCode,
    referralCredit: user.referralCredit,
    adminPermissions: user.role === "ADMIN" ? user.adminPermissions : undefined,
    twoFactorEnabled: user.role === "ADMIN" ? Boolean(user.twoFactor?.enabled) : undefined,
    recoveryCodesRemaining: user.role === "ADMIN" && user.twoFactor?.enabled && Array.isArray(user.twoFactor?.recoveryCodeHashes) ? user.twoFactor.recoveryCodeHashes.length : undefined,
    createdAt: user.createdAt,
  };
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

const authLimiter = rateLimit({ namespace: "auth", max: 8, windowMs: 15 * 60 * 1000, key: (req) => `${req.ip}:${String(req.body?.email || "").toLowerCase()}` });
const resetLimiter = rateLimit({ namespace: "reset", max: 5, windowMs: 30 * 60 * 1000, key: (req) => `${req.ip}:${String(req.body?.email || "").toLowerCase()}` });
const verificationHash = (value) => crypto.createHmac("sha256", process.env.JWT_SECRET).update(String(value)).digest("hex");
const recoveryCodeHash = (value) => crypto.createHmac("sha256", process.env.JWT_SECRET).update(String(value).replace(/[^A-Z0-9]/gi, "").toUpperCase()).digest("hex");
const generateRecoveryCodes = () => Array.from({ length: 10 }, () => {
  const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
});

function sessionResponse(res, session, user, status = 200) {
  setRefreshCookie(res, session.refreshToken);
  return res.status(status).json({ token: session.token, expiresInMinutes: session.expiresInMinutes, user: publicUser(user) });
}

function verifyAdminSecondFactor(user, code) {
  const value = String(code || "").trim();
  if (verifyTotp(revealTotpSecret(user.twoFactor.secret), value)) return { valid: true, usedRecoveryCode: false };
  const hash = recoveryCodeHash(value);
  const index = (user.twoFactor.recoveryCodeHashes || []).findIndex((stored) => stored === hash);
  if (index < 0) return { valid: false, usedRecoveryCode: false };
  user.twoFactor.recoveryCodeHashes.splice(index, 1);
  return { valid: true, usedRecoveryCode: true };
}

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!validatePassword(password)) return res.status(400).json({ error: "Password must be at least 8 characters and include a letter and number" });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    // Public registration can never choose a privileged role.
    const user = await User.create({ name, email, phone, passwordHash, role: "CUSTOMER" });
    user.referralCode = `DG${String(user._id).slice(-6).toUpperCase()}`;
    await user.save();
    const session = await createSession(user, req);
    sessionResponse(res, session, user, 201);
  } catch (err) {
    res.status(500).json({ error: "Registration failed", detail: err.message });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() }).select("+sessionVersion +twoFactor.secret");
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    if (user.role === "ADMIN" && user.twoFactor?.enabled) {
      const challengeToken = jwt.sign({ id: user._id, purpose: "ADMIN_2FA" }, process.env.JWT_SECRET, { expiresIn: "5m" });
      return res.json({ requiresTwoFactor: true, challengeToken });
    }
    const session = await createSession(user, req);
    sessionResponse(res, session, user);
  } catch (err) {
    res.status(500).json({ error: "Login failed", detail: err.message });
  }
});

// Provider-free pilot recovery: verify both values already stored on the account,
// then issue a short-lived token that can only be used to reset a password.
router.post("/forgot-password/verify", resetLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").replace(/\D/g, "");
    const user = await User.findOne({ email });
    const storedPhone = String(user?.phone || "").replace(/\D/g, "");
    if (!user || !phone || phone !== storedPhone) {
      return res.status(400).json({ error: "The email and registered phone number do not match" });
    }
    const resetToken = jwt.sign(
      { id: user._id, purpose: "PASSWORD_RESET" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );
    res.json({ resetToken, expiresInMinutes: 10 });
  } catch (err) {
    res.status(500).json({ error: "Could not verify this account", detail: err.message });
  }
});

router.post("/forgot-password/reset", async (req, res) => {
  try {
    if (!validatePassword(req.body.password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and include a letter and number" });
    }
    const payload = jwt.verify(String(req.body.resetToken || ""), process.env.JWT_SECRET);
    if (payload.purpose !== "PASSWORD_RESET") return res.status(400).json({ error: "Invalid reset session" });
    const user = await User.findById(payload.id).select("+sessionVersion");
    if (!user) return res.status(404).json({ error: "Account not found" });
    user.passwordHash = await bcrypt.hash(req.body.password, 10);
    user.sessionVersion = Number(user.sessionVersion || 0) + 1;
    await user.save();
    await revokeAllSessions(user._id);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "This reset session is invalid or has expired" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("+twoFactor.recoveryCodeHashes");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

router.put("/profile", requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();
    if (!name || !phone) return res.status(400).json({ error: "Name and phone are required" });
    const existing = await User.findById(req.user.id);
    if (!existing) return res.status(404).json({ error: "Account not found" });
    if (String(existing.phone) !== phone) existing.phoneVerifiedAt = null;
    existing.name = name; existing.phone = phone;
    const user = await existing.save();
    if (user.role === "LAUNDRY_PARTNER") await LaundryPartner.updateOne({ userId: user._id }, { phone });
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ error: "Could not update profile", detail: err.message });
  }
});

router.put("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!validatePassword(newPassword)) return res.status(400).json({ error: "New password must be at least 8 characters and include a letter and number" });
    const user = await User.findById(req.user.id).select("+sessionVersion");
    if (!user || !(await bcrypt.compare(String(currentPassword || ""), user.passwordHash))) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return res.status(400).json({ error: "Choose a different password" });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.sessionVersion = Number(user.sessionVersion || 0) + 1;
    await user.save();
    await revokeAllSessions(user._id);
    await writeAudit(req, "PASSWORD_CHANGED", "User", user._id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Could not change password", detail: err.message });
  }
});

router.post("/refresh", rateLimit({ namespace: "refresh", max: 30, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  try {
    const session = await rotateSession(getRefreshCookie(req), req);
    sessionResponse(res, session, session.user);
  } catch (error) {
    clearRefreshCookie(res);
    res.status(401).json({ error: error.message });
  }
});

router.post("/logout", async (req, res) => {
  await revokeSession(getRefreshCookie(req));
  clearRefreshCookie(res);
  res.json({ ok: true });
});

router.post("/logout-all", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+sessionVersion");
    if (!user) return res.status(404).json({ error: "Account not found" });
    user.sessionVersion = Number(user.sessionVersion || 0) + 1;
    await user.save();
    await revokeAllSessions(user._id);
    clearRefreshCookie(res);
    await writeAudit(req, "SIGNED_OUT_ALL_DEVICES", "User", user._id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not sign out all devices", detail: error.message });
  }
});

router.post("/2fa/verify-login", rateLimit({ namespace: "2fa-login", max: 8, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  try {
    const payload = jwt.verify(String(req.body.challengeToken || ""), process.env.JWT_SECRET);
    if (payload.purpose !== "ADMIN_2FA") throw new Error("Invalid verification session");
    const user = await User.findOne({ _id: payload.id, role: "ADMIN" }).select("+sessionVersion +twoFactor.secret +twoFactor.recoveryCodeHashes");
    if (!user?.twoFactor?.enabled) return res.status(400).json({ error: "Two-factor authentication is not enabled" });
    const verification = verifyAdminSecondFactor(user, req.body.code);
    if (!verification.valid) return res.status(400).json({ error: "Invalid authenticator or recovery code" });
    if (verification.usedRecoveryCode) await user.save();
    const session = await createSession(user, req);
    sessionResponse(res, session, user);
  } catch (error) { res.status(400).json({ error: error.message || "Could not verify code" }); }
});

router.post("/2fa/setup", requireAuth, async (req, res) => {
  const user = await User.findOne({ _id: req.user.id, role: "ADMIN" }).select("+twoFactor.secret +twoFactor.recoveryCodeHashes");
  if (!user) return res.status(403).json({ error: "Administrator access required" });
  const secret = generateTotpSecret();
  user.twoFactor.secret = protectTotpSecret(secret); user.twoFactor.enabled = false; user.twoFactor.enabledAt = null; user.twoFactor.recoveryCodeHashes = []; user.twoFactor.recoveryCodesGeneratedAt = null;
  await user.save();
  const issuer = encodeURIComponent("Dhobi Ghat Admin");
  res.json({ secret, otpauthUrl: `otpauth://totp/${issuer}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${issuer}` });
});

router.post("/2fa/enable", requireAuth, async (req, res) => {
  const user = await User.findOne({ _id: req.user.id, role: "ADMIN" }).select("+twoFactor.secret +twoFactor.recoveryCodeHashes");
  if (!user?.twoFactor?.secret || !verifyTotp(revealTotpSecret(user.twoFactor.secret), req.body.code)) return res.status(400).json({ error: "Invalid authenticator code" });
  const recoveryCodes = generateRecoveryCodes();
  user.twoFactor.enabled = true; user.twoFactor.enabledAt = new Date(); user.twoFactor.recoveryCodeHashes = recoveryCodes.map(recoveryCodeHash); user.twoFactor.recoveryCodesGeneratedAt = new Date(); await user.save();
  await writeAudit(req, "ADMIN_2FA_ENABLED", "User", user._id);
  res.json({ user: publicUser(user), recoveryCodes });
});

router.post("/2fa/disable", requireAuth, async (req, res) => {
  const user = await User.findOne({ _id: req.user.id, role: "ADMIN" }).select("+twoFactor.secret +twoFactor.recoveryCodeHashes");
  if (!user?.twoFactor?.enabled) return res.status(400).json({ error: "Two-factor authentication is not enabled" });
  const verification = verifyAdminSecondFactor(user, req.body.code);
  if (!verification.valid) return res.status(400).json({ error: "Invalid authenticator or recovery code" });
  user.twoFactor.enabled = false; user.twoFactor.secret = ""; user.twoFactor.enabledAt = null; user.twoFactor.recoveryCodeHashes = []; user.twoFactor.recoveryCodesGeneratedAt = null; await user.save();
  await writeAudit(req, "ADMIN_2FA_DISABLED", "User", user._id);
  res.json({ user: publicUser(user) });
});

router.post("/2fa/recovery-codes", requireAuth, async (req, res) => {
  const user = await User.findOne({ _id: req.user.id, role: "ADMIN" }).select("+twoFactor.secret +twoFactor.recoveryCodeHashes");
  if (!user?.twoFactor?.enabled || !verifyTotp(revealTotpSecret(user.twoFactor.secret), req.body.code)) return res.status(400).json({ error: "Enter a valid authenticator code" });
  const recoveryCodes = generateRecoveryCodes();
  user.twoFactor.recoveryCodeHashes = recoveryCodes.map(recoveryCodeHash);
  user.twoFactor.recoveryCodesGeneratedAt = new Date();
  await user.save();
  await writeAudit(req, "ADMIN_2FA_RECOVERY_CODES_REGENERATED", "User", user._id);
  res.json({ recoveryCodes });
});

router.put("/onboarding", requireAuth, async (req, res) => {
  const { monthlySpendBand, frustrations, wouldUsePriority, mostUsedService } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      onboarding: {
        completed: true,
        monthlySpendBand,
        frustrations,
        wouldUsePriority,
        mostUsedService,
      },
    },
    { new: true }
  );
  res.json({ user: publicUser(user) });
});

router.put("/address", requireAuth, async (req, res) => {
  const { label, line1, line2, landmark, pincode, lat, lng } = req.body;
  const user = await User.findById(req.user.id);
  user.addresses.push({ label, line1, line2, landmark, pincode, lat, lng });
  await user.save();
  res.json({ user: publicUser(user) });
});

router.post("/verification/request", requireAuth, rateLimit({ max: 5, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const channel = String(req.body.channel || "").toUpperCase();
  if (!["EMAIL", "PHONE"].includes(channel)) return res.status(400).json({ error: "Choose email or phone verification" });
  const user = await User.findById(req.user.id).select("+verification.emailCodeHash +verification.emailExpiresAt +verification.phoneCodeHash +verification.phoneExpiresAt");
  const code = String(crypto.randomInt(100000, 1000000));
  const field = channel === "EMAIL" ? "email" : "phone";
  user.verification[`${field}CodeHash`] = verificationHash(code);
  user.verification[`${field}ExpiresAt`] = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  let delivery;
  try { delivery = await deliverVerificationCode({ channel, destination: user[field], code }); }
  catch (error) { return res.status(503).json({ error: error.message }); }
  await writeAudit(req, "VERIFICATION_REQUESTED", "User", user._id, { channel });
  const response = { ok: true, expiresInMinutes: 10, message: `Verification code prepared for your ${field}.` };
  if (delivery.developmentCode) response.developmentCode = delivery.developmentCode;
  res.json(response);
});

router.post("/verification/confirm", requireAuth, rateLimit({ max: 8, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const channel = String(req.body.channel || "").toUpperCase();
  const field = channel === "EMAIL" ? "email" : channel === "PHONE" ? "phone" : "";
  if (!field) return res.status(400).json({ error: "Choose email or phone verification" });
  const user = await User.findById(req.user.id).select("+verification.emailCodeHash +verification.emailExpiresAt +verification.phoneCodeHash +verification.phoneExpiresAt");
  const expiresAt = user.verification?.[`${field}ExpiresAt`];
  const expected = user.verification?.[`${field}CodeHash`];
  if (!expected || !expiresAt || expiresAt < new Date() || verificationHash(String(req.body.code || "")) !== expected) return res.status(400).json({ error: "The verification code is invalid or expired" });
  user[`${field}VerifiedAt`] = new Date(); user.verification[`${field}CodeHash`] = ""; user.verification[`${field}ExpiresAt`] = null;
  await user.save(); await writeAudit(req, "CONTACT_VERIFIED", "User", user._id, { channel });
  res.json({ user: publicUser(user) });
});

export default router;
