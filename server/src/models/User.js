import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    pincode: String,
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
    adminPermissions: [{ type: String, enum: ["ORDERS", "OPERATIONS", "CUSTOMERS", "PROMOTIONS", "REPORTS", "SETTINGS", "ADMIN_ACCESS"] }],
    onboarding: { type: onboardingSchema, default: () => ({}) },
    addresses: [addressSchema],
    notificationPreferences: {
      orderUpdates: { type: Boolean, default: true },
      riderAssignments: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      adminAlerts: { type: Boolean, default: true },
    },
    emailVerifiedAt: { type: Date, default: null },
    phoneVerifiedAt: { type: Date, default: null },
    verification: {
      emailCodeHash: { type: String, default: "", select: false },
      emailExpiresAt: { type: Date, default: null, select: false },
      phoneCodeHash: { type: String, default: "", select: false },
      phoneExpiresAt: { type: Date, default: null, select: false },
    },
    referralCode: { type: String, uppercase: true, trim: true, sparse: true, unique: true },
    referralCredit: { type: Number, min: 0, default: 0 },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    savedGarments: [{ garmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Garment" }, quantity: { type: Number, min: 1, max: 99, default: 1 } }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
