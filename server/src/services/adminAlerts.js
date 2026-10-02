import Notification from "../models/Notification.js";
import User from "../models/User.js";

const shortId = (order) => String(order._id).slice(-6).toUpperCase();

async function logAndSend({ user, order, channel, message, sender }) {
  const notification = await Notification.create({ userId: user._id, orderId: order._id, channel, type: "ADMIN_NEW_ORDER", templateName: "ADMIN_ORDER_RECEIVED", title: "New order received", message, status: "QUEUED" });
  try {
    const result = await sender();
    notification.status = result?.skipped ? "SKIPPED" : "SENT";
    notification.sentAt = result?.skipped ? null : new Date();
  } catch (error) {
    notification.status = "FAILED";
    notification.metadata = { error: String(error.message || error).slice(0, 300) };
  }
  await notification.save();
  return notification;
}

async function sendEmail(to, subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_EMAIL_FROM;
  if (!apiKey || !from) return { skipped: true };
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, text }) });
  if (!response.ok) throw new Error(`Email provider rejected the alert (${response.status})`);
  return {};
}

async function sendWhatsApp(to, order) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_ADMIN_ORDER_TEMPLATE;
  if (!phoneNumberId || !accessToken || !templateName) return { skipped: true };
  const phone = String(to || "").replace(/\D/g, "");
  if (!phone) return { skipped: true };
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "template", template: { name: templateName, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" }, components: [{ type: "body", parameters: [{ type: "text", text: shortId(order) }, { type: "text", text: String(order.total || 0) }] }] } }) });
  if (!response.ok) throw new Error(`WhatsApp provider rejected the alert (${response.status})`);
  return {};
}

export async function notifyAdminsExternally(order) {
  const admins = await User.find({ role: "ADMIN", "notificationPreferences.adminAlerts": { $ne: false } }).select("name email phone notificationPreferences").lean();
  const message = `New order #${shortId(order)} received for ${order.serviceName || "laundry service"}. Total ₹${order.total}. Open the admin workspace to assign pickup.`;
  const jobs = [];
  for (const admin of admins) {
    if (admin.notificationPreferences?.emailAlerts !== false) jobs.push(logAndSend({ user: admin, order, channel: "EMAIL", message, sender: () => sendEmail(admin.email, `New Dhobi Ghat order #${shortId(order)}`, message) }));
    if (admin.notificationPreferences?.whatsAppAlerts !== false) jobs.push(logAndSend({ user: admin, order, channel: "WHATSAPP", message, sender: () => sendWhatsApp(admin.phone, order) }));
  }
  return Promise.allSettled(jobs);
}
