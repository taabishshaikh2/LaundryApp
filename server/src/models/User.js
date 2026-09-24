import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    lat: Number,
    lng: Number,
  },
  { _id: true }
);

const onboardingSchema = new mongoose.Schema(
  {
    completed: { type: Boolean, default: false },
    monthlySpendBand: String,
    frustrations: [String],
    wouldUsePriority: String,
    mostUsedService: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["CUSTOMER", "ADMIN", "RIDER", "LAUNDRY_PARTNER"], default: "CUSTOMER" },
    onboarding: { type: onboardingSchema, default: () => ({}) },
    addresses: [addressSchema],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
