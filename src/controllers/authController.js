/**
 * Auth Controller
 * POST /api/auth/login  — exchange credentials for JWT
 * GET  /api/auth/me     — return current user profile
 */

const { verifyPassword, signJWT } = require("../utils/auth");
const { validateLogin } = require("../utils/validators");
const { sendSuccess, sendBadRequest, sendUnauthorized } = require("../utils/response");
const { db } = require("../database");

function login(req, res) {
  const errors = validateLogin(req.body);
  if (errors.length > 0) {
    return sendBadRequest(res, "Validation failed", errors);
  }

  const { email, password } = req.body;

  const user = db.findOne("users", (u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    // Use same message for both "not found" and "wrong password" (security)
    return sendUnauthorized(res, "Invalid email or password");
  }

  if (user.status !== "active") {
    return sendUnauthorized(res, "Account is inactive. Contact an administrator.");
  }

  const isValid = verifyPassword(password, user.password);
  if (!isValid) {
    return sendUnauthorized(res, "Invalid email or password");
  }

  const token = signJWT({ userId: user.id, role: user.role });

  return sendSuccess(
    res,
    {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    },
    "Login successful"
  );
}

function getMe(req, res) {
  return sendSuccess(res, req.user, "Profile fetched");
}

module.exports = { login, getMe };
