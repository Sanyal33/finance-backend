/**
 * Authentication & Authorization Middleware
 *
 * authenticate  — verifies the Bearer JWT, attaches req.user
 * authorize     — role-based guard (usage: authorize("admin") or authorize(["admin","analyst"]))
 */

const { verifyJWT } = require("../utils/auth");
const { sendUnauthorized, sendForbidden } = require("../utils/response");
const { db } = require("../database");

function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendUnauthorized(res, "Missing or malformed Authorization header");
  }

  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload) {
    return sendUnauthorized(res, "Invalid or expired token");
  }

  // Re-fetch user to ensure they still exist and are active
  const user = db.findOne("users", (u) => u.id === payload.userId);
  if (!user) {
    return sendUnauthorized(res, "User no longer exists");
  }
  if (user.status !== "active") {
    return sendUnauthorized(res, "Account is inactive");
  }

  // Attach sanitized user to request (never expose password)
  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  next();
}

/**
 * Role-based authorization guard.
 * @param {string | string[]} roles - allowed role(s)
 */
function authorize(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, "Not authenticated");
    }
    if (!allowed.includes(req.user.role)) {
      return sendForbidden(
        res,
        `Access denied. Required role(s): ${allowed.join(", ")}. Your role: ${req.user.role}`
      );
    }
    next();
  };
}

module.exports = { authenticate, authorize };
