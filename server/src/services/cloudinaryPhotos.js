import { v2 as cloudinary } from "cloudinary";

const ROOT_FOLDER = String(process.env.CLOUDINARY_FOLDER || "apnalaundry").replace(/^\/+|\/+$/g, "");

if (!process.env.CLOUDINARY_URL && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function cloudinaryIsConfigured() {
  return Boolean(process.env.CLOUDINARY_URL || (
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  ));
}

function requireCloudinary() {
  if (!cloudinaryIsConfigured()) {
    const error = new Error("Photo storage is not configured. Add CLOUDINARY_URL or the three Cloudinary credential variables to the server environment.");
    error.statusCode = 503;
    throw error;
  }
}

function safeSegment(value, fallback) {
  const cleaned = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

export async function uploadPhoto(photo, { orderId, category = "evidence", publicId } = {}) {
  if (!photo?.dataUrl) return photo;
  requireCloudinary();
  const folder = `${ROOT_FOLDER}/orders/${safeSegment(orderId, "unknown")}/${safeSegment(category, "evidence")}`;
  const result = await cloudinary.uploader.upload(photo.dataUrl, {
    resource_type: "image",
    folder,
    public_id: publicId,
    overwrite: Boolean(publicId),
    unique_filename: !publicId,
    use_filename: false,
    invalidate: Boolean(publicId),
    tags: ["apnalaundry", safeSegment(category, "evidence")],
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type || "image",
    format: result.format || "",
    bytes: result.bytes || 0,
    width: result.width || 0,
    height: result.height || 0,
    caption: String(photo.caption || "").trim().slice(0, 120),
  };
}

export async function uploadPhotos(photos, context = {}) {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const uploaded = [];
  try {
    for (const photo of photos) uploaded.push(await uploadPhoto(photo, context));
    return uploaded;
  } catch (error) {
    await deleteCloudinaryPhotos(uploaded.map((photo) => photo.publicId), { throwOnFailure: false });
    throw error;
  }
}

export async function uploadHandoverItems(items, orderId) {
  const uploadedItems = [];
  const uploadedIds = [];
  try {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const photos = await uploadPhotos(item.photos, { orderId, category: `pickup-${index + 1}` });
      uploadedItems.push({ ...item, photos });
      uploadedIds.push(...photos.map((photo) => photo.publicId));
    }
    return uploadedItems;
  } catch (error) {
    await deleteCloudinaryPhotos(uploadedIds, { throwOnFailure: false });
    throw error;
  }
}

export async function deleteCloudinaryPhotos(publicIds, { throwOnFailure = true } = {}) {
  const ids = [...new Set((publicIds || []).filter(Boolean))];
  if (!ids.length) return;
  requireCloudinary();
  const results = await Promise.allSettled(ids.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true })));
  const failed = results.filter((result) => result.status === "rejected" || !["ok", "not found"].includes(result.value?.result));
  if (failed.length && throwOnFailure) throw new Error(`Could not delete ${failed.length} stored photo${failed.length === 1 ? "" : "s"}`);
}

export function orderPhotoPublicIds(order) {
  const ids = [];
  for (const item of order?.handover?.items || []) ids.push(...(item.photos || []).map((photo) => photo.publicId));
  for (const stage of order?.processing?.stages || []) ids.push(...(stage.photos || []).map((photo) => photo.publicId));
  ids.push(...(order?.processing?.qualityCheck?.photos || []).map((photo) => photo.publicId));
  if (order?.deliveryProof?.photo?.publicId) ids.push(order.deliveryProof.photo.publicId);
  return ids.filter(Boolean);
}

