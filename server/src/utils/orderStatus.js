import { sendWhatsAppNotification } from "../services/whatsapp.js";
import { ORDER_STATUS_LIST } from "../models/Order.js";

export { ORDER_STATUS_LIST };

/**
 * Moves an order to a new status: validates it, appends a status-history
 * entry (previous/new/who/when), saves the order, and fires the WhatsApp
 * notification for that status. Used by admin status changes, rider
 * status updates, partner status updates, and automatic bumps that
 * happen when a rider/partner is assigned — so every path gets the same
 * audit trail and the same notification behavior for free.
 */
export async function advanceOrderStatus(order, newStatus, { userId, role, note } = {}) {
  if (!ORDER_STATUS_LIST.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const previousStatus = order.status;
  order.status = newStatus;
  order.statusHistory.push({
    previousStatus,
    newStatus,
    changedBy: userId,
    changedByRole: role,
    note,
    timestamp: new Date(),
  });
  await order.save();

  await sendWhatsAppNotification(order, newStatus);

  return order;
}
