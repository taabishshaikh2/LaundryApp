import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import LaundryPartner from "../models/LaundryPartner.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    onboarding: user.onboarding,
    addresses: user.addresses,
    createdAt: user.createdAt,
  };
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, passwordHash });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: "Registration failed", detail: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: "Login failed", detail: err.message });
  }
});

// Provider-free pilot recovery: verify both values already stored on the account,
// then issue a short-lived token that can only be used to reset a password.
router.post("/forgot-password/verify", async (req, res) => {
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
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const payload = jwt.verify(String(req.body.resetToken || ""), process.env.JWT_SECRET);
    if (payload.purpose !== "PASSWORD_RESET") return res.status(400).json({ error: "Invalid reset session" });
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: "Account not found" });
    user.passwordHash = await bcrypt.hash(req.body.password, 10);
    await user.save();
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "This reset session is invalid or has expired" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

router.put("/profile", requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();
    if (!name || !phone) return res.status(400).json({ error: "Name and phone are required" });
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone }, { new: true });
    if (!user) return res.status(404).json({ error: "Account not found" });
    if (user.role === "LAUNDRY_PARTNER") await LaundryPartner.updateOne({ userId: user._id }, { phone });
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ error: "Could not update profile", detail: err.message });
  }
});

router.put("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!validatePassword(newPassword)) return res.status(400).json({ error: "New password must be at least 8 characters" });
    const user = await User.findById(req.user.id);
    if (!user || !(await bcrypt.compare(String(currentPassword || ""), user.passwordHash))) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return res.status(400).json({ error: "Choose a different password" });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Could not change password", detail: err.message });
  }
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
  const { label, line1, line2, landmark, lat, lng } = req.body;
  const user = await User.findById(req.user.id);
  user.addresses.push({ label, line1, line2, landmark, lat, lng });
  await user.save();
  res.json({ user: publicUser(user) });
});

export default router;
