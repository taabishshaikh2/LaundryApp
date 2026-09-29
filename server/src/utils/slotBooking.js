import mongoose from "mongoose";
import Slot from "../models/Slot.js";

export class SlotBookingError extends Error {
  constructor(message, { code = "SLOT_UNAVAILABLE", statusCode = 400 } = {}) {
    super(message);
    this.name = "SlotBookingError";
    this.code = code;
    this.statusCode = statusCode;
    this.publicMessage = message;
  }
}

export function startOfBusinessToday(now = new Date()) {
  const timeZone = process.env.BUSINESS_TIME_ZONE || "Asia/Kolkata";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value])
  );
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
}

export function slotEndDateTime(slot) {
  const datePart = new Date(slot.date).toISOString().slice(0, 10);
  const endTime = String(slot.timeRange || "").split("-")[1];
  const configuredOffset = process.env.BUSINESS_UTC_OFFSET || "+05:30";
  const offset = /^[+-]\d{2}:\d{2}$/.test(configuredOffset) ? configuredOffset : "+05:30";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || "")) return null;
  const end = new Date(`${datePart}T${endTime}:00${offset}`);
  return Number.isNaN(end.getTime()) ? null : end;
}

export function isSlotInFuture(slot, now = new Date()) {
  const end = slotEndDateTime(slot);
  return Boolean(end && end > now);
}

export async function reserveSlot(slotId, session) {
  if (!mongoose.Types.ObjectId.isValid(slotId)) {
    throw new SlotBookingError("Select a valid pickup slot", { code: "INVALID_SLOT" });
  }
  const existing = await Slot.findById(slotId).session(session);
  if (!existing) throw new SlotBookingError("The selected pickup slot no longer exists", { code: "INVALID_SLOT" });
  if (!isSlotInFuture(existing)) throw new SlotBookingError("The selected pickup slot has expired", { code: "EXPIRED_SLOT" });

  const slot = await Slot.findOneAndUpdate(
    {
      _id: slotId,
      $expr: { $lt: [{ $ifNull: ["$bookedCount", 0] }, "$maxOrders"] },
    },
    { $inc: { bookedCount: 1 } },
    { new: true, session }
  );
  if (slot) return slot;

  throw new SlotBookingError("That pickup slot just became full. Please choose another time.", {
    code: "SLOT_FULL",
    statusCode: 409,
  });
}

export async function releaseSlotReservation(slotId, session) {
  if (!slotId) return;
  await Slot.updateOne(
    { _id: slotId, bookedCount: { $gt: 0 } },
    { $inc: { bookedCount: -1 } },
    { session }
  );
}

