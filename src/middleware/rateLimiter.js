/**
 * Simple In-Memory Rate Limiter
 * Limits requests per IP to prevent abuse.
 * Default: 100 requests per 15 minutes per IP.
 */

const store = new Map(); // ip -> { count, resetAt }

function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 min
  const max = options.max || 100;

  return function (req, res, next) {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.writeHead(429, {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      });
      return res.end(
        JSON.stringify({
          success: false,
          message: `Too many requests. Please retry after ${retryAfter} seconds.`,
        })
      );
    }

    next();
  };
}

// Stricter limiter for auth endpoints
const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
const defaultLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });

module.exports = { rateLimiter, authLimiter, defaultLimiter };
