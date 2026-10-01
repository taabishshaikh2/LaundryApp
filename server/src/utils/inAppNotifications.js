import Notification from "../models/Notification.js";
import User from "../models/User.js";

const STATUS_COPY = {
  ORDER_PLACED: ["Order placed", "Your order has been received."],
  PICKUP_ASSIGNED: ["Pickup assigned", "A rider has been assigned to your pickup."],
  RIDER_ON_THE_WAY: ["Rider on the way", "Your rider is heading to the pickup address."],
  PICKED_UP: ["Garments picked up", "Your garments have been collected."],
  PROCESSING: ["Laundry in progress", "Your garments are now being processed."],
  READY: ["Order ready", "Your garments are packed and ready for delivery."],
  OUT_FOR_DELIVERY: ["Out for delivery", "Your clean garments are on the way."],
  DELIVERED: ["Order delivered", "Delivery verification succeeded and your order is complete."],
  CANCELLED: ["Order cancelled", "Your order has been cancelled. Open it for refund details."],
};

export async function notifyUser(userId, { title, message, type = "GENERAL", orderId = null, actionUrl = "", preference = "orderUpdates", metadata = {} }) {
  if (!userId) return null;
  const user = await User.findById(userId).select("notificationPreferences").lean();
  if (!user || user.notificationPreferences?.[preference] === false) return null;
  return Notification.create({ userId, orderId, channel: "IN_APP", title, message, type, actionUrl, metadata, status: "SENT", sentAt: new Date() });
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: "ADMIN", "notificationPreferences.adminAlerts": { $ne: false } }).select("_id").lean();
  return Promise.all(admins.map((admin) => notifyUser(admin._id, { ...payload, preference: "adminAlerts" })));
}

export async function notifyOrderStatus(order, status) {
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  return notifyUser(order.userId, { title: copy[0], message: copy[1], type: "ORDER_UPDATE", orderId: order._id, actionUrl: `/orders/${order._id}`, preference: status === "PICKUP_ASSIGNED" ? "riderAssignments" : "orderUpdates" });
}
