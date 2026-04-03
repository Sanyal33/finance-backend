/**
 * Standardized HTTP response helpers.
 * All API responses follow a consistent shape:
 *   { success, message, data?, errors?, meta? }
 */

function sendSuccess(res, data = null, message = "Success", statusCode = 200, meta = null) {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.writeHead(statusCode, { "Content-Type": "application/json" }),
    res.end(JSON.stringify(body));
}

function sendError(res, message = "An error occurred", statusCode = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendCreated(res, data, message = "Created successfully") {
  return sendSuccess(res, data, message, 201);
}

function sendNotFound(res, message = "Resource not found") {
  return sendError(res, message, 404);
}

function sendUnauthorized(res, message = "Unauthorized") {
  return sendError(res, message, 401);
}

function sendForbidden(res, message = "Forbidden: insufficient permissions") {
  return sendError(res, message, 403);
}

function sendBadRequest(res, message = "Bad request", errors = null) {
  return sendError(res, message, 400, errors);
}

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest,
};
