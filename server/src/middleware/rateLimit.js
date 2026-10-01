const buckets = new Map();

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, key = (req) => req.ip, message = "Too many attempts. Please try again later." } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = key(req);
    const current = buckets.get(bucketKey);
    if (!current || current.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
}, 10 * 60 * 1000).unref();
