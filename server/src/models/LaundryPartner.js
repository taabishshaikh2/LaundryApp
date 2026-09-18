import mongoose from "mongoose";

const laundryPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: String,
    address: String,
    servicesOffered: [String],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("LaundryPartner", laundryPartnerSchema);
