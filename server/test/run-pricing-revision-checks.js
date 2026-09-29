import assert from "node:assert/strict";
import mongoose from "mongoose";
import { buildPricingRevision, handoverHasDifferences, latestPricingRevision, pricingIsResolved } from "../src/utils/pricingRevision.js";

const shirtId = new mongoose.Types.ObjectId();
const handoverTime = new Date("2026-09-29T10:00:00.000Z");
const order = {
  items: [{ garmentId: shirtId, name: "Shirt", quantity: 2, unitPrice: 15 }],
  handover: {
    confirmedAt: handoverTime,
    lastUpdatedAt: handoverTime,
    items: [
      { garmentId: shirtId, name: "Shirt", orderedQuantity: 2, receivedQuantity: 1 },
      { garmentId: null, name: "Scarf", orderedQuantity: 0, receivedQuantity: 1 },
    ],
  },
  subtotal: 30,
  gstAmount: 5.4,
  total: 35.4,
  taxEnabled: true,
  taxPercent: 18,
  pricingRevisions: [],
};

assert.equal(handoverHasDifferences(order), true);
assert.equal(pricingIsResolved(order), false);
const calculated = buildPricingRevision(order, [
  { garmentId: shirtId, name: "Shirt", unitPrice: 999, reason: "One shirt received" },
  { garmentId: null, name: "Scarf", unitPrice: 20, reason: "Unexpected scarf" },
]);
assert.equal(calculated.lines[0].unitPrice, 15, "Existing garment price must come from the original order");
assert.equal(calculated.lines[1].unitPrice, 20);
assert.equal(calculated.revisedSubtotal, 35);
assert.equal(calculated.revisedTaxAmount, 6.3);
assert.equal(calculated.revisedTotal, 41.3);

order.pricingRevisions.push({ status: "APPROVED", handoverUpdatedAt: handoverTime });
assert.equal(latestPricingRevision(order).status, "APPROVED");
assert.equal(pricingIsResolved(order), true);
order.handover.lastUpdatedAt = new Date("2026-09-29T10:01:00.000Z");
assert.equal(pricingIsResolved(order), false, "A corrected handover must invalidate an older approval");

console.log("Pricing revision checks passed");
