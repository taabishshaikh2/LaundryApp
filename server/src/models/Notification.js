import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    channel: { type: String, default: "WHATSAPP" },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    type: { type: String, trim: true, maxlength: 60, default: "GENERAL" },
    templateName: String,
    message: String,
    status: { type: String, enum: ["QUEUED", "SENT", "FAILED", "SKIPPED"], default: "QUEUED" },
    sentAt: Date,
    readAt: { type: Date, default: null },
    actionUrl: { type: String, trim: true, maxlength: 240, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, channel: 1, readAt: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
