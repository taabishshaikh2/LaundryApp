import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Message copy per order status. Kept in one place so it's easy to hand
// these to Meta/Gupshup/Twilio for template approval later.
const TEMPLATES = {
  ORDER_PLACED: (o, name) => `Hi ${name}! Your Dhobi Ghat order #${shortId(o)} has been placed. We'll notify you at every step. Track: ${trackLink(o)}`,
  PICKUP_ASSIGNED: (o) => `A rider has been assigned to pick up your order #${shortId(o)}. Track: ${trackLink(o)}`,
  RIDER_ON_THE_WAY: (o) => `Your rider is on the way for order #${shortId(o)}.`,
  PICKED_UP: (o) => `Your laundry for order #${shortId(o)} has been picked up. Thank you!`,
  PROCESSING: (o) => `Your order #${shortId(o)} is now being processed.`,
  READY: (o) => `Good news — your order #${shortId(o)} is ready and will be out for delivery soon.`,
  OUT_FOR_DELIVERY: (o) => `Your order #${shortId(o)} is out for delivery. Track: ${trackLink(o)}`,
  DELIVERED: (o) => `Your order #${shortId(o)} has been delivered. Thanks for choosing Dhobi Ghat!`,
  CANCELLED: (o) => `Your order #${shortId(o)} has been cancelled. Contact support if this is unexpected.`,
};

function shortId(order) {
  return String(order._id).slice(-6).toUpperCase();
}

function trackLink(order) {
  const base = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  return `${base}/orders/${order._id}`;
}

/**
 * Sends (or, for now, simulates) a WhatsApp notification for an order's
 * current status and logs it to the Notification collection so it shows
 * up in the admin Notifications log regardless of whether real WhatsApp
 * credentials are configured.
 *
 * TO GO LIVE: once you have a WhatsApp Business API provider (Meta Cloud
 * API, Gupshup, Twilio, etc.), replace the body of the try block below
 * with the actual HTTP call to that provider, keeping the same
 * templateName/message/status bookkeeping so the admin log keeps working.
 */
export async function sendWhatsAppNotification(order, status) {
  const buildMessage = TEMPLATES[status];
  if (!buildMessage) return null;

  // order.userId may already be populated (has .name) or just an ObjectId —
  // handle both so callers don't need to remember to populate it.
  let customerName = order.userId?.name;
  if (!customerName) {
    const user = await User.findById(order.userId).select("name");
    customerName = user?.name || "there";
  }

  const message = buildMessage(order, customerName);

  const notification = await Notification.create({
    orderId: order._id,
    userId: order.userId,
    channel: "WHATSAPP",
    templateName: status,
    message,
    status: "QUEUED",
  });

  try {
    // ---- STUB: no real WhatsApp Business API configured yet ----
    // eslint-disable-next-line no-console
    console.log(`[WHATSAPP STUB] To user ${order.userId} — order ${shortId(order)} (${status}):\n  "${message}"`);

    notification.status = "SENT";
    notification.sentAt = new Date();
    await notification.save();
  } catch (err) {
    notification.status = "FAILED";
    await notification.save();
  }

  return notification;
}