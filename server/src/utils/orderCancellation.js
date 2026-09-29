import { releaseSlotReservation } from "./slotBooking.js";
import { actorDetails } from "./handover.js";

export const CUSTOMER_CANCELLABLE_STATUSES = ["ORDER_PLACED", "PICKUP_ASSIGNED", "RIDER_ON_THE_WAY"];
export const REFUND_STATUSES = ["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED", "PROCESSED"];

export async function cancelOrder(order, { userId, role, reason, session }) {
  if (order.status === "DELIVERED") throw new Error("Delivered orders cannot be cancelled");
  if (order.status === "CANCELLED") return false;
  if (role === "CUSTOMER" && !CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
    throw new Error("Pickup is already confirmed. Please contact support to request cancellation");
  }
  const cleanReason = String(reason || "").trim();
  if (cleanReason.length < 3) throw new Error("Please provide a cancellation reason");

  const actor = await actorDetails(userId, role);
  const previousStatus = order.status;
  const now = new Date();
  const paid = order.paymentStatus === "PAID";
  order.status = "CANCELLED";
  order.cancellation.reason = cleanReason.slice(0, 500);
  order.cancellation.requestedAt ||= now;
  order.cancellation.cancelledAt = now;
  order.cancellation.cancelledBy = userId;
  order.cancellation.cancelledByName = actor.changedByName;
  order.cancellation.cancelledByRole = role;
  order.cancellation.refundEligibility = paid ? (previousStatus === "PICKED_UP" || order.handover?.confirmedAt ? "REVIEW" : "FULL") : "NOT_REQUIRED";
  order.cancellation.refundStatus = paid ? "PENDING" : "NOT_REQUIRED";
  order.cancellation.refundAmount = paid && order.cancellation.refundEligibility === "FULL" ? order.total : 0;
  order.cancellation.auditTrail.push({ ...actor, action: "ORDER_CANCELLED", note: cleanReason, timestamp: now });
  order.statusHistory.push({ previousStatus, newStatus: "CANCELLED", changedBy: userId, changedByRole: role, note: cleanReason, timestamp: now });

  if (!order.slotReservationReleasedAt) {
    await releaseSlotReservation(order.pickupSlot, session);
    if (order.deliverySlot && String(order.deliverySlot) !== String(order.pickupSlot)) {
      await releaseSlotReservation(order.deliverySlot, session);
    }
    order.slotReservationReleasedAt = now;
  }
  await order.save({ session });
  return true;
}

