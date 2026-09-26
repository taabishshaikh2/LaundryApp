import mongoose from "mongoose";

const ORDER_STATUSES = [
  "ORDER_PLACED",
  "PICKUP_ASSIGNED",
  "RIDER_ON_THE_WAY",
  "PICKED_UP",
  "PROCESSING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const orderItemSchema = new mongoose.Schema(
  {
    garmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Garment" },
    name: String,
    quantity: { type: Number, default: 1 },
    treatment: { type: String, enum: ["WASH_IRON", "WASH_FOLD"], default: "WASH_IRON" },
    hasStain: { type: Boolean, default: false },
    unitPrice: Number,
    lineTotal: Number,
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: String,
    newStatus: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedByRole: String,
    note: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedByRole: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "LaundryPartner", default: null },
    address: {
      label: String,
      line1: String,
      line2: String,
      landmark: String,
    },
    // Speed: REGULAR (24-48hrs) or EXPRESS (1hr, Ironing only)
    speed: { type: String, enum: ["REGULAR", "EXPRESS"], default: "REGULAR" },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    serviceName: String,
    serviceCode: String, // WASHING, IRONING, DRY_CLEANING
    items: [orderItemSchema],
    subtotal: Number,
    gstAmount: Number,
    total: Number,
    status: { type: String, enum: ORDER_STATUSES, default: "ORDER_PLACED" },
    statusHistory: [statusHistorySchema],
    notes: [noteSchema],
  },
  { timestamps: true }
);

export const ORDER_STATUS_LIST = ORDER_STATUSES;
export default mongoose.model("Order", orderSchema);
