function sameGarment(left, right) {
  if (left.garmentId && right.garmentId) return String(left.garmentId) === String(right.garmentId);
  return String(left.name || "").trim().toLowerCase() === String(right.name || "").trim().toLowerCase();
}

export function latestPricingRevision(order) {
  return order.pricingRevisions?.length ? order.pricingRevisions[order.pricingRevisions.length - 1] : null;
}

export function handoverHasDifferences(order) {
  if (!order.handover?.confirmedAt) return false;
  return order.handover.items.some((item) => Number(item.orderedQuantity) !== Number(item.receivedQuantity));
}

export function pricingIsResolved(order) {
  if (!order.handover?.confirmedAt) return false;
  if (!handoverHasDifferences(order)) return true;
  const revision = latestPricingRevision(order);
  if (!revision || revision.status !== "APPROVED") return false;
  return new Date(revision.handoverUpdatedAt).getTime() >= new Date(order.handover.lastUpdatedAt).getTime();
}

export function buildPricingRevision(order, submittedLines) {
  if (!order.handover?.confirmedAt) throw new Error("Confirm the garment handover before revising the bill");
  if (!Array.isArray(submittedLines)) throw new Error("Revised bill lines are required");
  const pending = latestPricingRevision(order);
  if (pending?.status === "PENDING_CUSTOMER") throw new Error("The customer must respond to the current revision first");

  const lines = order.handover.items.map((received, index) => {
    const submitted = submittedLines[index];
    if (!submitted || !sameGarment(received, submitted)) throw new Error("Revised bill must match the latest handover record");
    const ordered = order.items.find((item) => sameGarment(item, received));
    const unitPrice = ordered ? Number(ordered.unitPrice) : Number(submitted.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100000) throw new Error(`Enter a valid unit price for ${received.name}`);
    const receivedQuantity = Number(received.receivedQuantity);
    const lineTotal = Math.round(unitPrice * receivedQuantity * 100) / 100;
    const defaultReason = Number(received.orderedQuantity) === receivedQuantity
      ? "No quantity change"
      : `${receivedQuantity} received instead of ${received.orderedQuantity} ordered`;
    return {
      garmentId: received.garmentId || null,
      name: received.name,
      orderedQuantity: Number(received.orderedQuantity),
      receivedQuantity,
      unitPrice,
      lineTotal,
      reason: String(submitted.reason || defaultReason).trim().slice(0, 300),
    };
  });
  const revisedSubtotal = Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
  const revisedTaxAmount = order.taxEnabled ? Math.round(revisedSubtotal * Number(order.taxPercent || 0)) / 100 : 0;
  const revisedTotal = Math.round((revisedSubtotal + revisedTaxAmount) * 100) / 100;
  return { lines, revisedSubtotal, revisedTaxAmount, revisedTotal };
}

