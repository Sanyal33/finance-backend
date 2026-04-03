/**
 * Auth Utilities
 * Password hashing uses Node's built-in crypto (PBKDF2).
 * JWT is implemented manually using HMAC-SHA256 — no external library needed.
 */

const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "finance_dashboard_secret_2024_change_in_prod";
const JWT_EXPIRES_IN = 24 * 60 * 60; // 24 hours in seconds

// ── Password Hashing (PBKDF2) ─────────────────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const derived = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return derived === hash;
}

// ── JWT (Manual HMAC-SHA256) ──────────────────────────────────────────────
function base64urlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf8");
}

function signJWT(payload) {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64urlEncode(
    JSON.stringify({ ...payload, iat: now, exp: now + JWT_EXPIRES_IN })
  );
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    if (sig !== expectedSig) return null;

    const payload = JSON.parse(base64urlDecode(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, signJWT, verifyJWT };
