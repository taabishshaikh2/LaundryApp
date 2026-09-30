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

const garmentPhotoSchema = new mongoose.Schema(
  {
    dataUrl: { type: String, required: true },
    caption: { type: String, maxlength: 120, default: "" },
  },
  { _id: false }
);

const receivedItemSchema = new mongoose.Schema(
  {
    garmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Garment", default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    orderedQuantity: { type: Number, min: 0, default: 0 },
    receivedQuantity: { type: Number, min: 0, required: true },
    stainNotes: { type: String, trim: true, maxlength: 500, default: "" },
    damageNotes: { type: String, trim: true, maxlength: 500, default: "" },
    specialCareNotes: { type: String, trim: true, maxlength: 500, default: "" },
    photos: { type: [garmentPhotoSchema], default: [] },
  },
  { _id: false }
);

const handoverAuditSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["CONFIRMED", "UPDATED"], required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    changedByName: { type: String, required: true },
    changedByRole: { type: String, required: true },
    summary: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const cancellationAuditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    changedByName: { type: String, required: true },
    changedByRole: { type: String, required: true },
    note: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const pricingLineSchema = new mongoose.Schema(
  {
    garmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Garment", default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    orderedQuantity: { type: Number, min: 0, default: 0 },
    receivedQuantity: { type: Number, min: 0, required: true },
    unitPrice: { type: Number, min: 0, required: true },
    lineTotal: { type: Number, min: 0, required: true },
    reason: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { _id: false }
);

const pricingAuditSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["CREATED", "APPROVED", "REJECTED"], required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    changedByName: { type: String, required: true },
    changedByRole: { type: String, required: true },
    note: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const pricingRevisionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["PENDING_CUSTOMER", "APPROVED", "REJECTED"], default: "PENDING_CUSTOMER" },
    lines: { type: [pricingLineSchema], default: [] },
    originalSubtotal: { type: Number, required: true },
    originalTaxAmount: { type: Number, required: true },
    originalTotal: { type: Number, required: true },
    revisedSubtotal: { type: Number, required: true },
    revisedTaxAmount: { type: Number, required: true },
    revisedTotal: { type: Number, required: true },
    taxEnabled: { type: Boolean, required: true },
    taxLabel: { type: String, required: true },
    taxPercent: { type: Number, required: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    handoverUpdatedAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, required: true },
    respondedAt: { type: Date, default: null },
    responseNote: { type: String, trim: true, maxlength: 500, default: "" },
    auditTrail: { type: [pricingAuditSchema], default: [] },
  },
  { _id: true }
);

const processingStageSchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    status: { type: String, enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "FAILED"], default: "NOT_STARTED" },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedByName: { type: String, default: "" },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    issueType: { type: String, enum: ["", "STAIN_REMAINS", "DAMAGE_FOUND", "CARE_CONCERN", "EQUIPMENT_DELAY", "OTHER"], default: "" },
    issueNote: { type: String, trim: true, maxlength: 500, default: "" },
    photos: { type: [garmentPhotoSchema], default: [] },
  },
  { _id: false }
);

const processingAuditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    stage: { type: String, default: "" },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    changedByName: { type: String, required: true },
    changedByRole: { type: String, required: true },
    note: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "LaundryPartner", default: null },
    pickupSlot: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", default: null },
    deliverySlot: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", default: null },
    slotReservationReleasedAt: { type: Date, default: null },
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
    taxEnabled: { type: Boolean, default: true },
    taxLabel: { type: String, default: "GST" },
    taxPercent: { type: Number, default: 18 },
    gstAmount: Number,
    minimumOrder: { type: Number, default: 0 },
    total: Number,
    status: { type: String, enum: ORDER_STATUSES, default: "ORDER_PLACED" },
    statusHistory: [statusHistorySchema],
    notes: [noteSchema],
    handover: {
      items: { type: [receivedItemSchema], default: [] },
      generalNotes: { type: String, trim: true, maxlength: 1000, default: "" },
      confirmedAt: { type: Date, default: null },
      confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      confirmedByName: { type: String, default: "" },
      confirmedByRole: { type: String, default: "" },
      lastUpdatedAt: { type: Date, default: null },
      auditTrail: { type: [handoverAuditSchema], default: [] },
    },
    cancellation: {
      reason: { type: String, trim: true, maxlength: 500, default: "" },
      requestedAt: { type: Date, default: null },
      cancelledAt: { type: Date, default: null },
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      cancelledByName: { type: String, default: "" },
      cancelledByRole: { type: String, default: "" },
      refundEligibility: { type: String, enum: ["NOT_REQUIRED", "FULL", "REVIEW"], default: "NOT_REQUIRED" },
      refundStatus: { type: String, enum: ["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED", "PROCESSED"], default: "NOT_REQUIRED" },
      refundAmount: { type: Number, min: 0, default: 0 },
      refundMethod: { type: String, trim: true, maxlength: 60, default: "" },
      refundReference: { type: String, trim: true, maxlength: 120, default: "" },
      auditTrail: { type: [cancellationAuditSchema], default: [] },
    },
    paymentStatus: { type: String, enum: ["UNPAID", "PAID", "REFUNDED", "PARTIALLY_REFUNDED"], default: "UNPAID" },
    paymentMethod: { type: String, default: "CASH_ON_DELIVERY" },
    pricingRevisions: { type: [pricingRevisionSchema], default: [] },
    processing: {
      requiredStages: { type: [String], default: [] },
      dueAt: { type: Date, default: null },
      intake: {
        status: { type: String, enum: ["PENDING", "MATCHED", "DISCREPANCY"], default: "PENDING" },
        bagCount: { type: Number, min: 1, default: 1 },
        expectedQuantity: { type: Number, min: 0, default: 0 },
        verifiedQuantity: { type: Number, min: 0, default: 0 },
        discrepancyNote: { type: String, trim: true, maxlength: 500, default: "" },
        confirmedAt: { type: Date, default: null },
        confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        confirmedByName: { type: String, default: "" },
      },
      stages: { type: [processingStageSchema], default: [] },
      qualityCheck: {
        status: { type: String, enum: ["PENDING", "PASSED", "FAILED"], default: "PENDING" },
        notes: { type: String, trim: true, maxlength: 1000, default: "" },
        photos: { type: [garmentPhotoSchema], default: [] },
        checkedAt: { type: Date, default: null },
        checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        checkedByName: { type: String, default: "" },
      },
      auditTrail: { type: [processingAuditSchema], default: [] },
    },
    // Set by admin when assigning a rider: STANDARD or EXPRESS delivery
    deliveryMethod: { type: String, enum: ["STANDARD", "EXPRESS"], default: null },
  },
  { timestamps: true }
);

export const ORDER_STATUS_LIST = ORDER_STATUSES;
export default mongoose.model("Order", orderSchema);
