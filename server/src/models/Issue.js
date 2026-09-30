import mongoose from "mongoose";

export const ISSUE_CATEGORIES = ["MISSING_GARMENT", "DAMAGED_GARMENT", "STAIN_REMAINING", "DELAYED_DELIVERY", "BILLING", "OTHER"];
export const ISSUE_STATUSES = ["OPEN", "INVESTIGATING", "AWAITING_CUSTOMER", "RESOLVED", "CLOSED"];
export const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const photoSchema = new mongoose.Schema({ dataUrl: { type: String, required: true }, caption: { type: String, maxlength: 120, default: "" } }, { _id: false });
const messageSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  visibility: { type: String, enum: ["CUSTOMER", "INTERNAL"], default: "CUSTOMER" },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  addedByName: { type: String, required: true },
  addedByRole: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });
const auditSchema = new mongoose.Schema({
  action: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  changedByName: { type: String, required: true },
  changedByRole: { type: String, required: true },
  note: { type: String, maxlength: 1000, default: "" },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const issueSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  category: { type: String, enum: ISSUE_CATEGORIES, required: true },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  photos: { type: [photoSchema], default: [] },
  status: { type: String, enum: ISSUE_STATUSES, default: "OPEN", index: true },
  priority: { type: String, enum: ISSUE_PRIORITIES, default: "MEDIUM", index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  resolutionDeadline: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  compensation: {
    type: { type: String, enum: ["NONE", "REFUND", "CREDIT", "REPROCESS"], default: "NONE" },
    amount: { type: Number, min: 0, default: 0 },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedByName: { type: String, default: "" },
  },
  messages: { type: [messageSchema], default: [] },
  auditTrail: { type: [auditSchema], default: [] },
}, { timestamps: true });

issueSchema.index({ createdAt: -1 });
export default mongoose.model("Issue", issueSchema);
