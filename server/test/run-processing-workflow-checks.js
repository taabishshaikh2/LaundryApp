import assert from "node:assert/strict";
import { handoverReceivedCount, initializeProcessing, nextProcessingStage, normalizeProcessingPhotos, processingIsReady, processingStagePlan } from "../src/utils/processingWorkflow.js";

assert.deepEqual(processingStagePlan("IRONING"), ["SORTING", "IRONING", "QUALITY_CHECK", "PACKING"]);
assert.deepEqual(processingStagePlan("DRY_CLEANING"), ["SORTING", "DRY_CLEANING", "FINISHING", "QUALITY_CHECK", "PACKING"]);

const order = {
  serviceCode: "IRONING",
  speed: "REGULAR",
  handover: { items: [{ receivedQuantity: 2 }, { receivedQuantity: 1 }] },
  processing: {
    requiredStages: [],
    dueAt: null,
    intake: { status: "PENDING" },
    stages: [],
    qualityCheck: { status: "PENDING" },
  },
};

assert.equal(handoverReceivedCount(order), 3);
initializeProcessing(order, new Date("2026-09-30T00:00:00.000Z"));
assert.equal(order.processing.dueAt.toISOString(), "2026-10-02T00:00:00.000Z");
assert.equal(nextProcessingStage(order).stage, "SORTING");
assert.equal(processingIsReady(order), false);

order.processing.intake.status = "MATCHED";
order.processing.stages.forEach((stage) => { stage.status = "COMPLETED"; });
order.processing.qualityCheck.status = "PASSED";
assert.equal(processingIsReady(order), true);
order.processing.stages.find((stage) => stage.stage === "PACKING").status = "IN_PROGRESS";
assert.equal(processingIsReady(order), false, "Packing must be complete before READY");

const smallPhoto = { dataUrl: `data:image/jpeg;base64,${Buffer.from("photo").toString("base64")}`, caption: "After ironing" };
assert.equal(normalizeProcessingPhotos([smallPhoto])[0].caption, "After ironing");
assert.throws(() => normalizeProcessingPhotos(Array(4).fill(smallPhoto)), /no more than 3/);

console.log("Processing workflow checks passed");
