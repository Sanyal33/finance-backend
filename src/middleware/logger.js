/**
 * Request Logger Middleware
 * Logs method, URL, status, and response time for every request.
 */

function logger(req, res, next) {
  const start = Date.now();
  const { method, url } = req;

  // Intercept res.end to capture status code
  const originalEnd = res.end.bind(res);
  res.end = function (...args) {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color =
      status >= 500 ? "\x1b[31m" :   // red
      status >= 400 ? "\x1b[33m" :   // yellow
      status >= 300 ? "\x1b[36m" :   // cyan
      "\x1b[32m";                     // green
    console.log(`${color}[${new Date().toISOString()}] ${method} ${url} ${status} ${ms}ms\x1b[0m`);
    originalEnd(...args);
  };

  next();
}

module.exports = logger;
