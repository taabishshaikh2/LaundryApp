import mongoose from "mongoose";

const laundryPartnerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // the login account for this partner
    businessName: { type: String, required: true },
    phone: String,
    address: String,
    servicesOffered: [String],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("LaundryPartner", laundryPartnerSchema);
