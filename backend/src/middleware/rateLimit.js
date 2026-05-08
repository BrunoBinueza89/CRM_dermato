function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
  return fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createRateLimiter(options) {
  const windowMs = parseInteger(options?.windowMs, 60_000);
  const max = parseInteger(options?.max, 300);
  const enabled = parseBoolean(options?.enabled, true);
  const message = options?.message || "Rate limit excedido. Tente novamente em instantes.";

  const keyGenerator = typeof options?.keyGenerator === "function" ? options.keyGenerator : (req) => req.ip || "unknown";
  const skip = typeof options?.skip === "function" ? options.skip : () => false;

  const store = new Map();

  return function rateLimit(req, res, next) {
    if (!enabled || skip(req)) return next();

    const now = Date.now();
    const key = String(keyGenerator(req));

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message });
    }

    return next();
  };
}

module.exports = { createRateLimiter };

