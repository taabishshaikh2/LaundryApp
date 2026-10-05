import mongoose from "mongoose";
import "../models/registerModels.js";
import Order from "../models/Order.js";
import Issue from "../models/Issue.js";

const state = {
  checkedAt: null,
  indexes: { status: "unchecked", missing: [], errors: [] },
  migrations: { status: "unchecked", pending: [] },
};

const enabled = (name, defaultValue = false) => {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return value === "true" || value === "1";
};

async function inspectIndexes(syncIndexes) {
  const missing = [];
  const errors = [];
  for (const name of mongoose.modelNames()) {
    const model = mongoose.model(name);
    try {
      if (syncIndexes) await model.createIndexes();
      const difference = await model.diffIndexes({ indexOptionsToCreate: true });
      for (const specification of difference.toCreate || []) missing.push({ model: name, specification });
    } catch (error) {
      errors.push({ model: name, message: error.message });
    }
  }
  return { status: missing.length || errors.length ? "attention_required" : "current", missing, errors };
}

async function inspectMigrations() {
  const [legacyOrders, legacyIssues] = await Promise.all([
    Order.countDocuments({ $or: [
      { "handover.items.photos.dataUrl": /^data:image\// },
      { "processing.stages.photos.dataUrl": /^data:image\// },
      { "processing.qualityCheck.photos.dataUrl": /^data:image\// },
      { "deliveryProof.photo.dataUrl": /^data:image\// },
    ] }),
    Issue.countDocuments({ "photos.dataUrl": /^data:image\// }),
  ]);
  const pending = [];
  if (legacyOrders || legacyIssues) pending.push({
    id: "cloudinary-photo-storage-v1",
    command: "npm run migrate:photos",
    records: legacyOrders + legacyIssues,
    blocking: enabled("REQUIRE_MIGRATIONS_CURRENT", false),
  });
  return { status: pending.length ? "pending" : "current", pending };
}

export async function inspectDatabaseInfrastructure({ syncIndexes = enabled("SYNC_DATABASE_INDEXES", true) } = {}) {
  state.indexes = await inspectIndexes(syncIndexes);
  state.migrations = await inspectMigrations();
  state.checkedAt = new Date().toISOString();
  return databaseInfrastructureState();
}

export function databaseInfrastructureState() {
  const blockingMigration = state.migrations.pending.some((migration) => migration.blocking);
  return {
    ...state,
    ready: state.indexes.status !== "attention_required" && !blockingMigration,
  };
}

