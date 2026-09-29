import User from "../models/User.js";

const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,/i;
const MAX_PHOTOS_PER_ITEM = 3;
const MAX_PHOTO_BYTES = 700 * 1024;

function cleanText(value, limit) {
  return String(value || "").trim().slice(0, limit);
}

function isGenericUnexpectedName(name) {
  return !name || name.toLowerCase().startsWith("unexpected garment");
}

function validatePhoto(photo) {
  const dataUrl = String(photo?.dataUrl || "");
  if (!DATA_URL_PATTERN.test(dataUrl)) throw new Error("Photos must be JPEG, PNG, or WebP images");
  const base64 = dataUrl.split(",")[1] || "";
  const size = Math.ceil((base64.length * 3) / 4);
  if (size > MAX_PHOTO_BYTES) throw new Error("Each garment photo must be smaller than 700 KB");
  return { dataUrl, caption: cleanText(photo?.caption, 120) };
}

export function normalizeHandoverItems(items, orderedItems) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Record at least one received garment");
  if (items.length > 60) throw new Error("Too many garment rows");
  const orderedByGarment = new Map(orderedItems.map((item) => [String(item.garmentId || item.name), item]));
  const normalized = items.map((item) => {
    const key = String(item.garmentId || item.name || "");
    const ordered = orderedByGarment.get(key);
    const receivedQuantity = Number(item.receivedQuantity);
    if (!Number.isInteger(receivedQuantity) || receivedQuantity < 0 || receivedQuantity > 200) {
      throw new Error("Received quantities must be whole numbers between 0 and 200");
    }
    const photos = Array.isArray(item.photos) ? item.photos : [];
    if (photos.length > MAX_PHOTOS_PER_ITEM) throw new Error("Add no more than 3 photos per garment");
    const name = cleanText(ordered?.name || item.name, 100);
    if (!ordered && isGenericUnexpectedName(name)) {
      throw new Error("Enter the actual name of every unexpected garment (for example: Shirt, bedsheet, or scarf)");
    }
    return {
      garmentId: ordered?.garmentId || item.garmentId || null,
      name,
      orderedQuantity: Number(ordered?.quantity || item.orderedQuantity || 0),
      receivedQuantity,
      stainNotes: cleanText(item.stainNotes, 500),
      damageNotes: cleanText(item.damageNotes, 500),
      specialCareNotes: cleanText(item.specialCareNotes, 500),
      photos: photos.map(validatePhoto),
    };
  });
  if (normalized.reduce((sum, item) => sum + item.receivedQuantity, 0) === 0) {
    throw new Error("At least one garment must be received");
  }
  return normalized;
}

export async function actorDetails(userId, role) {
  const user = await User.findById(userId).select("name").lean();
  return { changedBy: userId, changedByName: user?.name || role, changedByRole: role };
}

export function handoverSummary(items) {
  const ordered = items.reduce((sum, item) => sum + item.orderedQuantity, 0);
  const received = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const differences = items.filter((item) => item.orderedQuantity !== item.receivedQuantity).length;
  return `${received} garment${received === 1 ? "" : "s"} received; ${ordered} ordered; ${differences} difference${differences === 1 ? "" : "s"}`;
}

