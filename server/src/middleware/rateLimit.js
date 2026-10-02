import crypto from "crypto";
import RateLimitBucket from "../models/RateLimitBucket.js";

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, key = (req) => req.ip, message = "Too many attempts. Please try again later.", namespace = "general" } = {}) {
  return async (req, res, next) => {
    const now = Date.now();
    const rawKey = `${namespace}:${key(req)}`;
    const bucketKey = crypto.createHash("sha256").update(rawKey).digest("hex");
    try {
      let bucket = await RateLimitBucket.findOne({ key: bucketKey });
      if (!bucket || bucket.resetAt.getTime() <= now) {
        bucket = await RateLimitBucket.findOneAndUpdate(
          { key: bucketKey },
          { $set: { count: 1, resetAt: new Date(now + windowMs) } },
          { new: true, upsert: true }
        );
      } else {
        bucket = await RateLimitBucket.findOneAndUpdate(
          { key: bucketKey, resetAt: { $gt: new Date(now) } },
          { $inc: { count: 1 } },
          { new: true }
        );
      }
      if (bucket && bucket.count > max) {
        res.set("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt.getTime() - now) / 1000))));
        return res.status(429).json({ error: message });
      }
      return next();
    } catch (error) {
      // Authentication must stay available during a transient limiter-store error.
      console.error("Rate limiter unavailable:", error.message);
      return next();
    }
  };
}
