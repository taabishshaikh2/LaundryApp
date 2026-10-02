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
 * Sends a WhatsApp template notification for an order's
 * current status and logs it to the Notification collection so it shows
 * up in the admin Notifications log regardless of whether real WhatsApp
 * credentials are configured.
 *
 * Missing credentials or an unconfigured template are logged as SKIPPED,
 * allowing local development and ordering to continue safely.
 */
export async function sendWhatsAppNotification(order, status) {
  const buildMessage = TEMPLATES[status];
  if (!buildMessage) return null;

  // order.userId may already be populated (has .name) or just an ObjectId —
  // handle both so callers don't need to remember to populate it.
  let customerName = order.userId?.name;
  let customerPhone = order.userId?.phone;
  if (!customerName) {
    const user = await User.findById(order.userId).select("name phone");
    customerName = user?.name || "there";
    customerPhone = user?.phone || "";
  }

  const message = buildMessage(order, customerName);

  const notification = await Notification.create({
    orderId: order._id,
    userId: order.userId,
    channel: "WHATSAPP",
    templateName: process.env[`WHATSAPP_TEMPLATE_${status}`] || status,
    message,
    status: "QUEUED",
  });

  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const templateName = process.env[`WHATSAPP_TEMPLATE_${status}`];
    const phone = String(customerPhone || "").replace(/\D/g, "");
    if (!phoneNumberId || !accessToken || !templateName || !phone) notification.status = "SKIPPED";
    else {
      const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "template", template: { name: templateName, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" }, components: [{ type: "body", parameters: [{ type: "text", text: customerName }, { type: "text", text: shortId(order) }, { type: "text", text: trackLink(order) }] }] } }) });
      if (!response.ok) throw new Error(`WhatsApp provider rejected the message (${response.status})`);
      notification.status = "SENT"; notification.sentAt = new Date();
    }
    await notification.save();
  } catch (err) {
    notification.status = "FAILED";
    notification.metadata = { error: String(err.message || err).slice(0, 300) };
    await notification.save();
  }

  return notification;
}
