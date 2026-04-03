/**
 * Integration Test Suite
 * Finance Backend — Pure Node.js (no test framework needed)
 *
 * Run: node tests/integration.test.js
 */

const http = require("http");
const app = require("../app");

const PORT = 3999;
let passed = 0;
let failed = 0;
const results = [];

// ── Helpers ───────────────────────────────────────────────────────────────
function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function makeHeaders(token, extra = {}) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}),
    ...extra,
  };
}

function post(path, body, token) {
  const b = JSON.stringify(body);
  return request(
    {
      hostname: "localhost",
      port: PORT,
      path,
      method: "POST",
      headers: { ...makeHeaders(token), "Content-Length": Buffer.byteLength(b) },
    },
    b
  );
}

function get(path, token) {
  return request({
    hostname: "localhost",
    port: PORT,
    path,
    method: "GET",
    headers: makeHeaders(token),
  });
}

function put(path, body, token) {
  const b = JSON.stringify(body);
  return request(
    {
      hostname: "localhost",
      port: PORT,
      path,
      method: "PUT",
      headers: { ...makeHeaders(token), "Content-Length": Buffer.byteLength(b) },
    },
    b
  );
}

function patch(path, body, token) {
  const b = JSON.stringify(body);
  return request(
    {
      hostname: "localhost",
      port: PORT,
      path,
      method: "PATCH",
      headers: { ...makeHeaders(token), "Content-Length": Buffer.byteLength(b) },
    },
    b
  );
}

function del(path, token) {
  return request({
    hostname: "localhost",
    port: PORT,
    path,
    method: "DELETE",
    headers: makeHeaders(token),
  });
}

// ── Assertion helper ──────────────────────────────────────────────────────
function assert(testName, condition, details = "") {
  if (condition) {
    passed++;
    results.push(`  ✅  ${testName}`);
  } else {
    failed++;
    results.push(`  ❌  ${testName}${details ? " — " + details : ""}`);
  }
}

// ── Test Runner ───────────────────────────────────────────────────────────
async function runTests() {
  console.log("\n🧪  Finance Backend — Integration Test Suite\n");
  console.log("=".repeat(55));

  // ── Step 0: Boot server ─────────────────────────────────────────────
  await new Promise((resolve) => app.listen(PORT, resolve));

  // ── Step 1: Auth ────────────────────────────────────────────────────
  console.log("\n📌  Auth");

  const loginRes = await post("/api/auth/login", {
    email: "admin@finance.com",
    password: "Admin@123",
  });
  assert("POST /auth/login — admin gets 200", loginRes.status === 200);
  assert("Login response has token", !!loginRes.body.data?.token);
  const ADMIN = loginRes.body.data.token;

  const vLoginRes = await post("/api/auth/login", {
    email: "viewer@finance.com",
    password: "Viewer@123",
  });
  assert("POST /auth/login — viewer gets 200", vLoginRes.status === 200);
  const VIEWER = vLoginRes.body.data.token;

  const aLoginRes = await post("/api/auth/login", {
    email: "analyst@finance.com",
    password: "Analyst@123",
  });
  assert("POST /auth/login — analyst gets 200", aLoginRes.status === 200);
  const ANALYST = aLoginRes.body.data.token;

  const badLogin = await post("/api/auth/login", {
    email: "wrong@example.com",
    password: "wrongpass",
  });
  assert("POST /auth/login — bad credentials → 401", badLogin.status === 401);

  const missingFields = await post("/api/auth/login", { email: "not-an-email" });
  assert("POST /auth/login — missing password → 400", missingFields.status === 400);

  const meRes = await get("/api/auth/me", ADMIN);
  assert("GET /auth/me — returns user profile", meRes.status === 200 && meRes.body.data?.role === "admin");

  const meNoToken = await get("/api/auth/me");
  assert("GET /auth/me — no token → 401", meNoToken.status === 401);

  // ── Step 2: Health ──────────────────────────────────────────────────
  console.log("\n📌  Health");
  const health = await get("/api/health");
  assert("GET /health → 200", health.status === 200 && health.body.success === true);

  // ── Step 3: User Management ─────────────────────────────────────────
  console.log("\n📌  User Management");

  const usersRes = await get("/api/users", ADMIN);
  assert("GET /users — admin → 200", usersRes.status === 200);
  assert("GET /users — returns array", Array.isArray(usersRes.body.data));
  assert("GET /users — no passwords exposed", usersRes.body.data.every((u) => !u.password));

  const usersViewer = await get("/api/users", VIEWER);
  assert("GET /users — viewer → 403", usersViewer.status === 403);

  const usersAnalyst = await get("/api/users", ANALYST);
  assert("GET /users — analyst → 403", usersAnalyst.status === 403);

  // Create user
  const createUser = await post(
    "/api/users",
    { name: "Test User", email: "testuser@example.com", password: "Test@123", role: "viewer" },
    ADMIN
  );
  assert("POST /users — admin creates user → 201", createUser.status === 201);
  const newUserId = createUser.body.data?.id;

  // Duplicate email
  const dupEmail = await post(
    "/api/users",
    { name: "Dup", email: "testuser@example.com", password: "Test@123" },
    ADMIN
  );
  assert("POST /users — duplicate email → 400", dupEmail.status === 400);

  // Create user without required fields
  const invalidUser = await post("/api/users", { name: "No Email" }, ADMIN);
  assert("POST /users — missing fields → 400", invalidUser.status === 400);

  // Get single user
  const singleUser = await get("/api/users/" + newUserId, ADMIN);
  assert("GET /users/:id — admin → 200", singleUser.status === 200);

  // Update user
  const updatedUser = await put("/api/users/" + newUserId, { name: "Updated Name" }, ADMIN);
  assert("PUT /users/:id — updates name", updatedUser.status === 200 && updatedUser.body.data?.name === "Updated Name");

  // Update status
  const statusUpdate = await patch("/api/users/" + newUserId + "/status", { status: "inactive" }, ADMIN);
  assert("PATCH /users/:id/status — deactivate", statusUpdate.status === 200 && statusUpdate.body.data?.status === "inactive");

  // Delete user
  const deleteUser = await del("/api/users/" + newUserId, ADMIN);
  assert("DELETE /users/:id — admin deletes → 200", deleteUser.status === 200);

  const gone = await get("/api/users/" + newUserId, ADMIN);
  assert("GET /users/:id — after delete → 404", gone.status === 404);

  // ── Step 4: Financial Records ───────────────────────────────────────
  console.log("\n📌  Financial Records");

  const recordsAll = await get("/api/records", VIEWER);
  assert("GET /records — viewer → 200", recordsAll.status === 200);
  assert("GET /records — has pagination meta", !!recordsAll.body.meta?.total);

  // Admin creates record
  const createRecord = await post(
    "/api/records",
    { amount: 1500, type: "income", category: "Consulting", date: "2026-03-10", notes: "Q1 consulting fee" },
    ADMIN
  );
  assert("POST /records — admin → 201", createRecord.status === 201);
  const recId = createRecord.body.data?.id;

  // Viewer cannot create
  const viewerCreate = await post(
    "/api/records",
    { amount: 500, type: "income", category: "Test", date: "2026-01-01" },
    VIEWER
  );
  assert("POST /records — viewer → 403", viewerCreate.status === 403);

  // Analyst cannot create
  const analystCreate = await post(
    "/api/records",
    { amount: 500, type: "income", category: "Test", date: "2026-01-01" },
    ANALYST
  );
  assert("POST /records — analyst → 403", analystCreate.status === 403);

  // Validation: negative amount
  const badAmount = await post(
    "/api/records",
    { amount: -500, type: "income", category: "Test", date: "2026-01-01" },
    ADMIN
  );
  assert("POST /records — negative amount → 400", badAmount.status === 400);

  // Validation: bad type
  const badType = await post(
    "/api/records",
    { amount: 100, type: "unknown", category: "Test", date: "2026-01-01" },
    ADMIN
  );
  assert("POST /records — invalid type → 400", badType.status === 400);

  // Validation: bad date
  const badDate = await post(
    "/api/records",
    { amount: 100, type: "income", category: "Test", date: "not-a-date" },
    ADMIN
  );
  assert("POST /records — invalid date → 400", badDate.status === 400);

  // Get single record
  const singleRecord = await get("/api/records/" + recId, ANALYST);
  assert("GET /records/:id — analyst → 200", singleRecord.status === 200);

  // Update record (admin)
  const updateRecord = await put("/api/records/" + recId, { amount: 2000, notes: "Updated notes" }, ADMIN);
  assert("PUT /records/:id — admin updates → 200", updateRecord.status === 200 && updateRecord.body.data?.amount === 2000);

  // Viewer cannot update
  const viewerUpdate = await put("/api/records/" + recId, { amount: 999 }, VIEWER);
  assert("PUT /records/:id — viewer → 403", viewerUpdate.status === 403);

  // Filter by type
  const incomeOnly = await get("/api/records?type=income", ADMIN);
  assert(
    "GET /records?type=income — all income",
    incomeOnly.body.data?.every((r) => r.type === "income")
  );

  // Filter by category
  const catFilter = await get("/api/records?category=Consulting", ADMIN);
  assert("GET /records?category=Consulting — filtered", catFilter.body.data?.length > 0);

  // Soft delete
  const softDelete = await del("/api/records/" + recId, ADMIN);
  assert("DELETE /records/:id — soft delete → 200", softDelete.status === 200);

  const deletedRecord = await get("/api/records/" + recId, ADMIN);
  assert("GET /records/:id — soft deleted → 404", deletedRecord.status === 404);

  // ── Step 5: Dashboard ───────────────────────────────────────────────
  console.log("\n📌  Dashboard Analytics");

  const summary = await get("/api/dashboard/summary", VIEWER);
  assert("GET /dashboard/summary — viewer → 200", summary.status === 200);
  assert("Summary has income/expenses/net", 
    summary.body.data?.total_income !== undefined &&
    summary.body.data?.total_expenses !== undefined &&
    summary.body.data?.net_balance !== undefined
  );
  assert("Net balance is correct", 
    Math.abs(summary.body.data.net_balance - (summary.body.data.total_income - summary.body.data.total_expenses)) < 0.01
  );

  const byCategory = await get("/api/dashboard/by-category", ANALYST);
  assert("GET /dashboard/by-category — analyst → 200", byCategory.status === 200);
  assert("By-category returns array", Array.isArray(byCategory.body.data));

  const viewerCat = await get("/api/dashboard/by-category", VIEWER);
  assert("GET /dashboard/by-category — viewer → 403", viewerCat.status === 403);

  const trendsMonthly = await get("/api/dashboard/trends?period=monthly", ADMIN);
  assert("GET /dashboard/trends (monthly) → 200", trendsMonthly.status === 200);
  assert("Monthly trends = 12 entries", trendsMonthly.body.data?.length === 12);

  const trendsWeekly = await get("/api/dashboard/trends?period=weekly", ANALYST);
  assert("GET /dashboard/trends (weekly) → 200", trendsWeekly.status === 200);

  const recent = await get("/api/dashboard/recent?limit=5", VIEWER);
  assert("GET /dashboard/recent — viewer → 200", recent.status === 200);
  assert("Recent activity limited to 5", recent.body.data?.length <= 5);

  // ── Step 6: 404 for unknown routes ─────────────────────────────────
  console.log("\n📌  Edge Cases");

  const notFound = await get("/api/unknown-endpoint", ADMIN);
  assert("Unknown route → 404", notFound.status === 404);

  const missingRecord = await get("/api/records/nonexistent-id", ADMIN);
  assert("GET /records/:id (missing) → 404", missingRecord.status === 404);

  // ── Results ─────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(55));
  results.forEach((r) => console.log(r));
  console.log("\n" + "=".repeat(55));
  console.log(`\n  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
