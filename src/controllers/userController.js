/**
 * User Controller
 *
 * GET    /api/users          — list all users           [admin]
 * GET    /api/users/:id      — get a single user        [admin]
 * POST   /api/users          — create user              [admin]
 * PUT    /api/users/:id      — update user              [admin]
 * PATCH  /api/users/:id/status — toggle active/inactive [admin]
 * DELETE /api/users/:id      — delete user              [admin]
 */

const { hashPassword } = require("../utils/auth");
const { validateCreateUser, validateUpdateUser } = require("../utils/validators");
const {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendForbidden,
} = require("../utils/response");
const { db } = require("../database");

// Strip password from user object before sending to client
function sanitize(user) {
  const { password, ...rest } = user;
  return rest;
}

function listUsers(req, res) {
  const { role, status, page = "1", limit = "20" } = req.query;

  let users = db.find("users");

  if (role) users = users.filter((u) => u.role === role);
  if (status) users = users.filter((u) => u.status === status);

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const total = users.length;
  const totalPages = Math.ceil(total / limitNum);
  const paginated = users.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return sendSuccess(res, paginated.map(sanitize), "Users fetched", 200, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  });
}

function getUser(req, res) {
  const { id } = req.params;
  const user = db.findOne("users", (u) => u.id === id);
  if (!user) return sendNotFound(res, "User not found");
  return sendSuccess(res, sanitize(user), "User fetched");
}

function createUser(req, res) {
  const errors = validateCreateUser(req.body);
  if (errors.length > 0) return sendBadRequest(res, "Validation failed", errors);

  const { name, email, password, role = "viewer" } = req.body;

  // Check duplicate email
  const existing = db.findOne("users", (u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return sendBadRequest(res, "Email already in use");

  const user = db.insert("users", {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashPassword(password),
    role,
    status: "active",
  });

  return sendCreated(res, sanitize(user), "User created successfully");
}

function updateUser(req, res) {
  const { id } = req.params;
  const user = db.findOne("users", (u) => u.id === id);
  if (!user) return sendNotFound(res, "User not found");

  // Prevent an admin from downgrading themselves
  if (id === req.user.id && req.body.role && req.body.role !== "admin") {
    return sendForbidden(res, "You cannot change your own role");
  }

  const errors = validateUpdateUser(req.body);
  if (errors.length > 0) return sendBadRequest(res, "Validation failed", errors);

  const { name, email, role, status, password } = req.body;
  const updates = {};

  if (name) updates.name = name.trim();
  if (role) updates.role = role;
  if (status) updates.status = status;
  if (email) {
    const dup = db.findOne(
      "users",
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id
    );
    if (dup) return sendBadRequest(res, "Email already in use");
    updates.email = email.toLowerCase().trim();
  }
  if (password) {
    if (password.length < 6) return sendBadRequest(res, "Password must be at least 6 characters");
    updates.password = hashPassword(password);
  }

  const updated = db.update("users", id, updates);
  return sendSuccess(res, sanitize(updated), "User updated");
}

function updateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!["active", "inactive"].includes(status)) {
    return sendBadRequest(res, "status must be 'active' or 'inactive'");
  }

  if (id === req.user.id) {
    return sendForbidden(res, "You cannot change your own status");
  }

  const user = db.findOne("users", (u) => u.id === id);
  if (!user) return sendNotFound(res, "User not found");

  const updated = db.update("users", id, { status });
  return sendSuccess(res, sanitize(updated), `User status updated to ${status}`);
}

function deleteUser(req, res) {
  const { id } = req.params;

  if (id === req.user.id) {
    return sendForbidden(res, "You cannot delete your own account");
  }

  const user = db.findOne("users", (u) => u.id === id);
  if (!user) return sendNotFound(res, "User not found");

  db.delete("users", id);
  return sendSuccess(res, null, "User deleted successfully");
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
};
