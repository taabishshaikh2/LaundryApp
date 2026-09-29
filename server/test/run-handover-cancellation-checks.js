import assert from "node:assert/strict";
import mongoose from "mongoose";
import Order from "../src/models/Order.js";
import { handoverSummary, normalizeHandoverItems } from "../src/utils/handover.js";
import { CUSTOMER_CANCELLABLE_STATUSES, REFUND_STATUSES } from "../src/utils/orderCancellation.js";

const garmentId = new mongoose.Types.ObjectId();
const orderedItems = [{ garmentId, name: "Shirt", quantity: 2 }];
const items = normalizeHandoverItems([{
  garmentId,
  name: "A client-supplied name is ignored",
  receivedQuantity: 1,
  stainNotes: "Collar mark",
  damageNotes: "",
  specialCareNotes: "Low heat",
  photos: [{ dataUrl: `data:image/jpeg;base64,${Buffer.from("small-image").toString("base64")}`, caption: "Pickup" }],
}], orderedItems);

assert.equal(items[0].name, "Shirt");
assert.equal(items[0].orderedQuantity, 2);
assert.equal(items[0].receivedQuantity, 1);
assert.match(handoverSummary(items), /1 garment received; 2 ordered; 1 difference/);
assert.throws(() => normalizeHandoverItems([{ ...items[0], receivedQuantity: -1 }], orderedItems), /whole numbers/);
assert.throws(() => normalizeHandoverItems([{ ...items[0], photos: Array(4).fill(items[0].photos[0]) }], orderedItems), /no more than 3/);

const order = new Order({
  userId: new mongoose.Types.ObjectId(),
  items: orderedItems,
  subtotal: 100,
  total: 118,
});
assert.deepEqual(CUSTOMER_CANCELLABLE_STATUSES, ["ORDER_PLACED", "PICKUP_ASSIGNED", "RIDER_ON_THE_WAY"]);
assert.ok(!CUSTOMER_CANCELLABLE_STATUSES.includes("PICKED_UP"));
assert.ok(REFUND_STATUSES.includes("PROCESSED"));
assert.equal(order.paymentStatus, "UNPAID");
assert.equal(order.paymentMethod, "CASH_ON_DELIVERY");
assert.equal(order.cancellation.refundStatus, "NOT_REQUIRED");

console.log("Handover and cancellation rule checks passed");
