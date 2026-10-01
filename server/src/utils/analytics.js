const round = (value, places = 2) => Number((Number(value || 0)).toFixed(places));
const idOf = (value) => String(value?._id || value || "");
const nameOf = (value, fallback = "Unassigned") => value?.name || value?.businessName || fallback;
const hoursBetween = (start, end) => start && end ? (new Date(end) - new Date(start)) / 36e5 : null;
const statusTime = (order, status) => order.statusHistory?.find((entry) => entry.newStatus === status)?.timestamp || null;

export function buildAnalytics({ orders, issues, slots, firstOrderByUser, from, to }) {
  const nonCancelled = orders.filter((order) => order.status !== "CANCELLED");
  const delivered = orders.filter((order) => order.status === "DELIVERED");
  const revenue = nonCancelled.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const refunds = orders.reduce((sum, order) => sum + (order.cancellation?.refundStatus === "PROCESSED" ? Number(order.cancellation.refundAmount || 0) : 0), 0);
  const garmentCount = orders.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0);
  const customerIds = [...new Set(orders.map((order) => idOf(order.userId)).filter(Boolean))];
  const newCustomers = customerIds.filter((id) => firstOrderByUser[id] && new Date(firstOrderByUser[id]) >= from && new Date(firstOrderByUser[id]) <= to).length;

  const daily = new Map();
  for (let date = new Date(from); date <= to; date.setUTCDate(date.getUTCDate() + 1)) {
    const key = date.toISOString().slice(0, 10);
    daily.set(key, { date: key, orders: 0, revenue: 0, garments: 0 });
  }
  for (const order of orders) {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    const row = daily.get(key) || { date: key, orders: 0, revenue: 0, garments: 0 };
    row.orders += 1;
    if (order.status !== "CANCELLED") row.revenue += Number(order.total || 0);
    row.garments += (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    daily.set(key, row);
  }

  const group = (source, keyFn, seed, update) => {
    const map = new Map();
    source.forEach((item) => { const key = keyFn(item); if (!map.has(key)) map.set(key, seed(item, key)); update(map.get(key), item); });
    return [...map.values()];
  };
  const services = group(orders, (order) => order.serviceCode || order.serviceName || "UNKNOWN", (order, key) => ({ code: key, name: order.serviceName || key.replaceAll("_", " "), orders: 0, garments: 0, revenue: 0 }), (row, order) => { row.orders++; row.garments += (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0); if (order.status !== "CANCELLED") row.revenue += Number(order.total || 0); }).sort((a, b) => b.orders - a.orders);
  const garments = group(orders.flatMap((order) => (order.items || []).map((item) => ({ ...item, cancelled: order.status === "CANCELLED" }))), (item) => item.name || "Unknown", (_, key) => ({ name: key, quantity: 0, revenue: 0 }), (row, item) => { row.quantity += Number(item.quantity || 0); if (!item.cancelled) row.revenue += Number(item.lineTotal || 0); }).sort((a, b) => b.quantity - a.quantity);
  const statuses = group(orders, (order) => order.status, (_, key) => ({ status: key, orders: 0 }), (row) => row.orders++).sort((a, b) => b.orders - a.orders);
  const issueCategories = group(issues, (issue) => issue.category, (_, key) => ({ category: key, count: 0 }), (row) => row.count++).sort((a, b) => b.count - a.count);

  const issueByOrder = new Map();
  issues.forEach((issue) => { const key = idOf(issue.orderId); if (!issueByOrder.has(key)) issueByOrder.set(key, []); issueByOrder.get(key).push(issue); });
  const riders = group(orders.filter((order) => order.riderId), (order) => idOf(order.riderId), (order, id) => ({ id, name: nameOf(order.riderId), assigned: 0, pickups: 0, delivered: 0, deliveryHours: [], complaints: 0 }), (row, order) => {
    row.assigned++; if (order.handover?.confirmedAt) row.pickups++; if (order.status === "DELIVERED") row.delivered++;
    const duration = hoursBetween(statusTime(order, "OUT_FOR_DELIVERY"), order.deliveryProof?.verifiedAt || statusTime(order, "DELIVERED")); if (duration !== null && duration >= 0) row.deliveryHours.push(duration);
    row.complaints += (issueByOrder.get(idOf(order._id)) || []).length;
  }).map((row) => ({ ...row, completionRate: row.assigned ? round(row.delivered / row.assigned * 100, 1) : 0, averageDeliveryHours: row.deliveryHours.length ? round(row.deliveryHours.reduce((a, b) => a + b, 0) / row.deliveryHours.length, 1) : null, deliveryHours: undefined })).sort((a, b) => b.delivered - a.delivered);

  const partners = group(orders.filter((order) => order.partnerId), (order) => idOf(order.partnerId), (order, id) => ({ id, name: nameOf(order.partnerId), orders: 0, completed: 0, delayed: 0, qualityFailures: 0, processingHours: [] }), (row, order) => {
    row.orders++; if (["READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) row.completed++;
    row.qualityFailures += (order.processing?.auditTrail || []).filter((entry) => entry.action === "QUALITY_FAILED").length;
    const readyAt = statusTime(order, "READY"); if (order.processing?.dueAt && new Date(order.processing.dueAt) < new Date(readyAt || Date.now())) row.delayed++;
    const duration = hoursBetween(statusTime(order, "PROCESSING"), readyAt); if (duration !== null && duration >= 0) row.processingHours.push(duration);
  }).map((row) => ({ ...row, completionRate: row.orders ? round(row.completed / row.orders * 100, 1) : 0, averageProcessingHours: row.processingHours.length ? round(row.processingHours.reduce((a, b) => a + b, 0) / row.processingHours.length, 1) : null, processingHours: undefined })).sort((a, b) => b.orders - a.orders);

  const slotCapacity = slots.reduce((sum, slot) => sum + Number(slot.maxOrders || 0), 0);
  const slotBookings = slots.reduce((sum, slot) => sum + Number(slot.bookedCount || 0), 0);
  const issueOpen = issues.filter((issue) => !["RESOLVED", "CLOSED"].includes(issue.status)).length;
  const issueOverdue = issues.filter((issue) => issue.resolutionDeadline && new Date(issue.resolutionDeadline) < new Date() && !["RESOLVED", "CLOSED"].includes(issue.status)).length;
  const qualityFailures = orders.reduce((sum, order) => sum + (order.processing?.auditTrail || []).filter((entry) => entry.action === "QUALITY_FAILED").length, 0);
  const processingIssues = orders.reduce((sum, order) => sum + (order.processing?.stages || []).filter((stage) => stage.issueType).length, 0);
  const intakeDiscrepancies = orders.filter((order) => order.processing?.intake?.status === "DISCREPANCY").length;
  const garmentCountDifferences = orders.filter((order) => {
    if (!order.handover?.confirmedAt) return false;
    const ordered = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const received = (order.handover.items || []).reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
    return ordered !== received;
  }).length;
  const garmentClaims = issues.filter((issue) => ["MISSING_GARMENT", "DAMAGED_GARMENT", "STAIN_REMAINING"].includes(issue.category)).length;

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: { orders: orders.length, activeOrders: orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status)).length, deliveredOrders: delivered.length, cancelledOrders: orders.filter((order) => order.status === "CANCELLED").length, garments: garmentCount, revenue: round(revenue), refunds: round(refunds), netRevenue: round(revenue - refunds), averageOrderValue: nonCancelled.length ? round(revenue / nonCancelled.length) : 0, cancellationRate: orders.length ? round(orders.filter((order) => order.status === "CANCELLED").length / orders.length * 100, 1) : 0 },
    customers: { unique: customerIds.length, new: newCustomers, repeat: Math.max(0, customerIds.length - newCustomers) },
    issues: { total: issues.length, open: issueOpen, overdue: issueOverdue, resolved: issues.filter((issue) => ["RESOLVED", "CLOSED"].includes(issue.status)).length, categories: issueCategories },
    quality: { qualityFailures, processingIssues, intakeDiscrepancies, garmentCountDifferences, garmentClaims, claimsPer100Deliveries: delivered.length ? round(garmentClaims / delivered.length * 100, 1) : 0 },
    slots: { capacity: slotCapacity, booked: slotBookings, utilization: slotCapacity ? round(slotBookings / slotCapacity * 100, 1) : 0, rows: slots.map((slot) => ({ id: idOf(slot), date: slot.date, timeRange: slot.timeRange, capacity: slot.maxOrders, booked: slot.bookedCount, utilization: slot.maxOrders ? round(slot.bookedCount / slot.maxOrders * 100, 1) : 0 })) },
    trends: [...daily.values()].map((row) => ({ ...row, revenue: round(row.revenue) })), services: services.map((row) => ({ ...row, revenue: round(row.revenue) })), garments: garments.map((row) => ({ ...row, revenue: round(row.revenue) })), statuses, riders, partners,
  };
}
