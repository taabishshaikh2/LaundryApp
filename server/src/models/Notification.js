import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    channel: { type: String, default: "WHATSAPP" },
    templateName: String,
    message: String,
    status: { type: String, enum: ["QUEUED", "SENT", "FAILED"], default: "QUEUED" },
    sentAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
