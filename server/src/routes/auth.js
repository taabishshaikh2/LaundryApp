import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
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
  };
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

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
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
