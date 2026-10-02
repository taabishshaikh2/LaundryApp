import crypto from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function generateTotpSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i < bits.length; i += 5) output += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return output;
}

export function protectTotpSecret(secret) {
  const key = crypto.createHash("sha256").update(process.env.JWT_SECRET).digest(); const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", key, iv); const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]); const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function revealTotpSecret(value) {
  if (!String(value || "").startsWith("v1:")) return value;
  const [, iv, tag, encrypted] = value.split(":"); const key = crypto.createHash("sha256").update(process.env.JWT_SECRET).digest(); const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

function decodeBase32(value) {
  let bits = "";
  for (const char of value.replace(/=+$/g, "").toUpperCase()) {
    const index = ALPHABET.indexOf(char);
    if (index >= 0) bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codeAt(secret, counter) {
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
}

export function verifyTotp(secret, code) {
  const normalized = String(code || "").replace(/\D/g, "");
  const counter = Math.floor(Date.now() / 30000);
  return normalized.length === 6 && [-1, 0, 1].some((drift) => crypto.timingSafeEqual(Buffer.from(codeAt(secret, counter + drift)), Buffer.from(normalized)));
}
