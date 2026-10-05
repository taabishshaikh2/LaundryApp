import "dotenv/config";
import crypto from "crypto";
import mongoose from "mongoose";
import Order from "../src/models/Order.js";
import Issue from "../src/models/Issue.js";
import { cloudinaryIsConfigured, uploadPhoto } from "../src/services/cloudinaryPhotos.js";

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
if (!cloudinaryIsConfigured()) throw new Error("CLOUDINARY_URL is required");

const hashId = (dataUrl) => crypto.createHash("sha256").update(dataUrl).digest("hex").slice(0, 32);
let migrated = 0;
let skipped = 0;

async function migratePhoto(photo, context) {
  if (!photo?.dataUrl || photo.publicId) {
    skipped += 1;
    return false;
  }
  const stored = await uploadPhoto(
    { dataUrl: photo.dataUrl, caption: photo.caption },
    { ...context, publicId: hashId(photo.dataUrl) }
  );
  Object.assign(photo, stored, { dataUrl: "" });
  migrated += 1;
  return true;
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  for await (const order of Order.find({
    $or: [
      { "handover.items.photos.dataUrl": /^data:image\// },
      { "processing.stages.photos.dataUrl": /^data:image\// },
      { "processing.qualityCheck.photos.dataUrl": /^data:image\// },
      { "deliveryProof.photo.dataUrl": /^data:image\// },
    ],
  }).cursor()) {
    let changed = false;
    for (let itemIndex = 0; itemIndex < (order.handover?.items || []).length; itemIndex += 1) {
      const item = order.handover.items[itemIndex];
      for (const photo of item.photos || []) changed = await migratePhoto(photo, { orderId: order._id, category: `pickup-${itemIndex + 1}` }) || changed;
    }
    for (const stage of order.processing?.stages || []) {
      for (const photo of stage.photos || []) changed = await migratePhoto(photo, { orderId: order._id, category: `processing-${String(stage.stage).toLowerCase()}` }) || changed;
    }
    for (const photo of order.processing?.qualityCheck?.photos || []) changed = await migratePhoto(photo, { orderId: order._id, category: "quality-check" }) || changed;
    if (order.deliveryProof?.photo) changed = await migratePhoto(order.deliveryProof.photo, { orderId: order._id, category: "delivery" }) || changed;
    if (changed) {
      order.markModified("handover");
      order.markModified("processing");
      order.markModified("deliveryProof");
      await order.save();
      console.log(`Migrated order ${order._id}`);
    }
  }

  for await (const issue of Issue.find({ "photos.dataUrl": /^data:image\// }).cursor()) {
    let changed = false;
    for (const photo of issue.photos || []) changed = await migratePhoto(photo, { orderId: issue.orderId, category: "customer-issue" }) || changed;
    if (changed) {
      issue.markModified("photos");
      await issue.save();
      console.log(`Migrated issue ${issue._id}`);
    }
  }
  console.log(`Photo migration complete: ${migrated} uploaded, ${skipped} already migrated or empty.`);
} finally {
  await mongoose.disconnect();
}

