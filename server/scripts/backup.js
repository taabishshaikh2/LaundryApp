import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
if (!process.env.BACKUP_ENCRYPTION_KEY) throw new Error("BACKUP_ENCRYPTION_KEY is required (use a long random secret)");
const key = crypto.createHash("sha256").update(process.env.BACKUP_ENCRYPTION_KEY).digest();
function encrypt(value) {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}
await mongoose.connect(process.env.MONGODB_URI);
const target = path.resolve(process.env.BACKUP_DIRECTORY || "./backups");
await fs.mkdir(target, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const collections = await mongoose.connection.db.listCollections().toArray();
const manifest = { createdAt: new Date().toISOString(), database: mongoose.connection.name, collections: {} };
for (const { name } of collections) {
  const documents = await mongoose.connection.db.collection(name).find({}).toArray();
  await fs.writeFile(path.join(target, `${stamp}-${name}.json.enc`), encrypt(documents));
  manifest.collections[name] = documents.length;
}
await fs.writeFile(path.join(target, `${stamp}-manifest.json.enc`), encrypt(manifest));
console.log(`Backup completed: ${target}`);
await mongoose.disconnect();
