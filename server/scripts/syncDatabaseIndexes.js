import "dotenv/config";
import mongoose from "mongoose";
import { inspectDatabaseInfrastructure } from "../src/services/databaseReadiness.js";

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");

await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
try {
  const result = await inspectDatabaseInfrastructure({ syncIndexes: true });
  console.log(JSON.stringify(result, null, 2));
  if (result.indexes.status !== "current") process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

