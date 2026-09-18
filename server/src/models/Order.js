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

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    address: {
      label: String,
      line1: String,
      line2: String,
      landmark: String,
    },
    priority: { type: String, enum: ["REGULAR", "PRIORITY"], default: "REGULAR" },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    serviceName: String,
    items: [orderItemSchema],
    subtotal: Number,
    gstAmount: Number,
    total: Number,
    status: { type: String, enum: ORDER_STATUSES, default: "ORDER_PLACED" },
    statusHistory: [statusHistorySchema],
  },
  { timestamps: true }
);

export const ORDER_STATUS_LIST = ORDER_STATUSES;
export default mongoose.model("Order", orderSchema);
