const STAGE_PLANS = {
  WASHING: ["SORTING", "WASHING", "DRYING", "FINISHING", "QUALITY_CHECK", "PACKING"],
  IRONING: ["SORTING", "IRONING", "QUALITY_CHECK", "PACKING"],
  DRY_CLEANING: ["SORTING", "DRY_CLEANING", "FINISHING", "QUALITY_CHECK", "PACKING"],
};

const IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,/i;
const MAX_PHOTO_BYTES = 700 * 1024;

export function processingStagePlan(serviceCode) {
  return STAGE_PLANS[String(serviceCode || "").toUpperCase()] || STAGE_PLANS.WASHING;
}

export function handoverReceivedCount(order) {
  return (order.handover?.items || []).reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
}

export function normalizeProcessingPhotos(photos) {
  if (!Array.isArray(photos)) return [];
  if (photos.length > 3) throw new Error("Add no more than 3 photos at a time");
  return photos.map((photo) => {
    const dataUrl = String(photo?.dataUrl || "");
    if (!IMAGE_PATTERN.test(dataUrl)) throw new Error("Photos must be JPEG, PNG, or WebP images");
    const base64 = dataUrl.split(",")[1] || "";
    const size = Math.ceil((base64.length * 3) / 4);
    if (size > MAX_PHOTO_BYTES) throw new Error("Each processing photo must be smaller than 700 KB");
    return { dataUrl, caption: String(photo?.caption || "").trim().slice(0, 120) };
  });
}

export function initializeProcessing(order, now = new Date()) {
  const requiredStages = processingStagePlan(order.serviceCode);
  order.processing.requiredStages = requiredStages;
  const existing = new Map((order.processing.stages || []).map((stage) => [stage.stage, stage]));
  order.processing.stages = requiredStages.map((stage) => existing.get(stage) || { stage, status: "NOT_STARTED" });
  if (!order.processing.dueAt) {
    const hours = order.speed === "EXPRESS" ? 2 : 48;
    order.processing.dueAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
  }
  return order.processing;
}

export function nextProcessingStage(order) {
  return (order.processing?.stages || []).find((stage) => stage.status !== "COMPLETED") || null;
}

export function processingIsReady(order) {
  const processing = order.processing;
  if (!processing || processing.intake?.status !== "MATCHED") return false;
  if (processing.qualityCheck?.status !== "PASSED") return false;
  return processing.requiredStages.length > 0 && processing.requiredStages.every((required) =>
    processing.stages.some((stage) => stage.stage === required && stage.status === "COMPLETED")
  );
}

export function processingProgress(order) {
  const required = order.processing?.requiredStages?.length || 0;
  const completed = (order.processing?.stages || []).filter((stage) => stage.status === "COMPLETED").length;
  return { completed, required, percent: required ? Math.round((completed / required) * 100) : 0 };
}

