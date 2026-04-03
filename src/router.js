/**
 * Lightweight HTTP Router
 * Supports route params (:id), query strings, and middleware chains.
 * Built entirely on Node.js core — no express dependency.
 */

const url = require("url");

class Router {
  constructor() {
    this.routes = []; // { method, pattern, paramNames, handlers }
    this.globalMiddleware = [];
  }

  use(fn) {
    this.globalMiddleware.push(fn);
    return this;
  }

  // Register a route
  _register(method, path, ...handlers) {
    const paramNames = [];
    const regexStr = path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    const pattern = new RegExp(`^${regexStr}$`);
    this.routes.push({ method, pattern, paramNames, handlers });
    return this;
  }

  get(path, ...handlers) { return this._register("GET", path, ...handlers); }
  post(path, ...handlers) { return this._register("POST", path, ...handlers); }
  put(path, ...handlers) { return this._register("PUT", path, ...handlers); }
  patch(path, ...handlers) { return this._register("PATCH", path, ...handlers); }
  delete(path, ...handlers) { return this._register("DELETE", path, ...handlers); }

  // Returns an async request handler function
  handler() {
    return (req, res) => {
      const parsed = url.parse(req.url, true);
      req.query = parsed.query;
      req.params = {};

      const pathname = parsed.pathname;
      const method = req.method.toUpperCase();

      // Find matching route
      let matched = null;
      let params = {};
      for (const route of this.routes) {
        if (route.method !== method) continue;
        const match = pathname.match(route.pattern);
        if (match) {
          matched = route;
          route.paramNames.forEach((name, i) => {
            params[name] = decodeURIComponent(match[i + 1]);
          });
          break;
        }
      }

      if (!matched) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, message: `Route not found: ${method} ${pathname}` }));
      }

      req.params = params;

      // Run global middleware + route handlers in sequence
      const chain = [...this.globalMiddleware, ...matched.handlers];
      let idx = 0;

      function next(err) {
        if (err) {
          console.error("Middleware error:", err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "Internal server error" }));
          }
          return;
        }
        if (idx >= chain.length) return;
        const fn = chain[idx++];
        try {
          fn(req, res, next);
        } catch (e) {
          next(e);
        }
      }

      next();
    };
  }
}

module.exports = Router;
