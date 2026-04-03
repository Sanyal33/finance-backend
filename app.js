/**
 * Application Entry Point
 * Wires together all routes, middleware, and controllers.
 */

const http = require("http");
const Router = require("./src/router");
const bodyParser = require("./src/middleware/bodyParser");
const logger = require("./src/middleware/logger");
const { defaultLimiter, authLimiter } = require("./src/middleware/rateLimiter");
const { authenticate, authorize } = require("./src/middleware/auth");
const { initDB } = require("./src/database");

// Controllers
const authCtrl = require("./src/controllers/authController");
const userCtrl = require("./src/controllers/userController");
const recordCtrl = require("./src/controllers/recordController");
const dashCtrl = require("./src/controllers/dashboardController");

// ── Init DB ──────────────────────────────────────────────────────────────
initDB();

// ── Router ───────────────────────────────────────────────────────────────
const router = new Router();

// Global middleware
router.use(logger);
router.use(bodyParser);
router.use(defaultLimiter);
router.use(corsMiddleware);

// ── Health ───────────────────────────────────────────────────────────────
router.get("/api/health", (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    success: true,
    message: "Finance Backend is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  }));
});

// ── Auth Routes ──────────────────────────────────────────────────────────
router.post("/api/auth/login", authLimiter, authCtrl.login);
router.get("/api/auth/me", authenticate, authCtrl.getMe);

// ── User Routes (Admin only) ──────────────────────────────────────────────
router.get("/api/users", authenticate, authorize("admin"), userCtrl.listUsers);
router.get("/api/users/:id", authenticate, authorize("admin"), userCtrl.getUser);
router.post("/api/users", authenticate, authorize("admin"), userCtrl.createUser);
router.put("/api/users/:id", authenticate, authorize("admin"), userCtrl.updateUser);
router.patch("/api/users/:id/status", authenticate, authorize("admin"), userCtrl.updateUserStatus);
router.delete("/api/users/:id", authenticate, authorize("admin"), userCtrl.deleteUser);

// ── Financial Record Routes ───────────────────────────────────────────────
// Read: all roles
router.get(
  "/api/records",
  authenticate,
  authorize("admin", "analyst", "viewer"),
  recordCtrl.listRecords
);
router.get(
  "/api/records/:id",
  authenticate,
  authorize("admin", "analyst", "viewer"),
  recordCtrl.getRecord
);
// Write: admin only
router.post("/api/records", authenticate, authorize("admin"), recordCtrl.createRecord);
router.put("/api/records/:id", authenticate, authorize("admin"), recordCtrl.updateRecord);
router.delete("/api/records/:id", authenticate, authorize("admin"), recordCtrl.deleteRecord);

// ── Dashboard Routes ──────────────────────────────────────────────────────
// Summary: all roles
router.get(
  "/api/dashboard/summary",
  authenticate,
  authorize("admin", "analyst", "viewer"),
  dashCtrl.getSummary
);
router.get(
  "/api/dashboard/recent",
  authenticate,
  authorize("admin", "analyst", "viewer"),
  dashCtrl.getRecentActivity
);
// Advanced analytics: analyst + admin
router.get(
  "/api/dashboard/by-category",
  authenticate,
  authorize("admin", "analyst"),
  dashCtrl.getByCategory
);
router.get(
  "/api/dashboard/trends",
  authenticate,
  authorize("admin", "analyst"),
  dashCtrl.getTrends
);

// ── CORS Middleware ───────────────────────────────────────────────────────
function corsMiddleware(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  next();
}

// ── HTTP Server ───────────────────────────────────────────────────────────
const app = http.createServer(router.handler());

module.exports = app;
