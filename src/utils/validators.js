/**
 * Input validation helpers.
 * Returns an array of error strings (empty = valid).
 */

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  // Min 6 chars
  return typeof password === "string" && password.length >= 6;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return typeof value === "number" && isFinite(value) && value > 0;
}

function isValidDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

// ── Domain Validators ─────────────────────────────────────────────────────

const VALID_ROLES = ["admin", "analyst", "viewer"];
const VALID_STATUSES = ["active", "inactive"];
const VALID_TYPES = ["income", "expense"];

function validateCreateUser(body) {
  const errors = [];
  if (!isNonEmptyString(body.name)) errors.push("name is required");
  if (!body.email || !validateEmail(body.email)) errors.push("valid email is required");
  if (!body.password || !validatePassword(body.password))
    errors.push("password must be at least 6 characters");
  if (body.role && !VALID_ROLES.includes(body.role))
    errors.push(`role must be one of: ${VALID_ROLES.join(", ")}`);
  return errors;
}

function validateUpdateUser(body) {
  const errors = [];
  if (body.email !== undefined && !validateEmail(body.email))
    errors.push("valid email is required");
  if (body.role !== undefined && !VALID_ROLES.includes(body.role))
    errors.push(`role must be one of: ${VALID_ROLES.join(", ")}`);
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status))
    errors.push(`status must be one of: ${VALID_STATUSES.join(", ")}`);
  return errors;
}

function validateCreateRecord(body) {
  const errors = [];
  if (body.amount === undefined || !isPositiveNumber(Number(body.amount)))
    errors.push("amount must be a positive number");
  if (!VALID_TYPES.includes(body.type))
    errors.push(`type must be one of: ${VALID_TYPES.join(", ")}`);
  if (!isNonEmptyString(body.category)) errors.push("category is required");
  if (!body.date || !isValidDate(body.date)) errors.push("valid date is required (YYYY-MM-DD)");
  return errors;
}

function validateUpdateRecord(body) {
  const errors = [];
  if (body.amount !== undefined && !isPositiveNumber(Number(body.amount)))
    errors.push("amount must be a positive number");
  if (body.type !== undefined && !VALID_TYPES.includes(body.type))
    errors.push(`type must be one of: ${VALID_TYPES.join(", ")}`);
  if (body.date !== undefined && !isValidDate(body.date))
    errors.push("valid date is required (YYYY-MM-DD)");
  return errors;
}

function validateLogin(body) {
  const errors = [];
  if (!body.email || !validateEmail(body.email)) errors.push("valid email is required");
  if (!body.password || !isNonEmptyString(body.password)) errors.push("password is required");
  return errors;
}

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateCreateRecord,
  validateUpdateRecord,
  validateLogin,
  VALID_ROLES,
  VALID_TYPES,
};
