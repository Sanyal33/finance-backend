# Finance Data Processing and Access Control Backend

> A backend API built for a finance dashboard system — handling users, roles, financial records, and analytics. Written in **pure Node.js with zero external dependencies**.

---

## What This Project Does

This is a fully functional REST API backend that powers a finance dashboard. It lets different types of users — admins, analysts, and viewers — interact with financial data based on their role. An admin can do everything. An analyst can read records and run analytics. A viewer can only see the dashboard summary.

The entire system is built without any external libraries. No Express, no JWT package, no bcrypt. Everything — the HTTP router, authentication, password hashing, token generation — is written from scratch using Node.js built-in modules. This was a deliberate choice to demonstrate how these things actually work under the hood.

---

## Tech Stack

| Layer | What I Used | Why |
|-------|-------------|-----|
| Runtime | Node.js (built-ins only) | Zero dependencies, fully portable |
| HTTP Server | `node:http` + custom Router | Built from scratch to show architecture thinking |
| Authentication | Manual HMAC-SHA256 JWT | No external `jsonwebtoken` needed |
| Password Security | PBKDF2 via `node:crypto` | Equivalent to bcrypt, no extra package |
| Database | JSON file (`data/db.json`) | Simple, self-contained, easy to swap out |
| Tests | Custom Node.js test runner | No Jest or Mocha needed |

> **Important note on the database:** The JSON file is intentional for this assignment. In a real production system, you would swap `src/database.js` with a PostgreSQL or MongoDB adapter. All the business logic in the controllers would remain exactly the same — only the data layer changes.

---

## Project Structure

```
finance-backend/
├── app.js                          # Where all routes and middleware are wired together
├── index.js                        # Server entry point — starts listening on a port
├── data/
│   └── db.json                     # Auto-created on first run, holds all data
├── src/
│   ├── router.js                   # Custom HTTP router that supports :param style routes
│   ├── database.js                 # Read/write/query layer over the JSON file
│   ├── controllers/
│   │   ├── authController.js       # Handles login and /me profile endpoint
│   │   ├── userController.js       # Full user management (create, update, delete)
│   │   ├── recordController.js     # Financial records with filters and soft delete
│   │   └── dashboardController.js  # Analytics: summary, trends, categories, recent
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification and role-based access control
│   │   ├── bodyParser.js           # Parses incoming JSON request bodies
│   │   ├── logger.js               # Colour-coded request logger
│   │   └── rateLimiter.js          # Limits requests per IP to prevent abuse
│   └── utils/
│       ├── auth.js                 # Password hashing + JWT sign/verify functions
│       ├── response.js             # Consistent JSON response formatting
│       └── validators.js           # Input validation for all request bodies
└── tests/
    └── integration.test.js         # 50 automated tests covering everything
```

---

## Getting Started

No npm install needed. Just clone and run.

```bash
cd finance-backend
node index.js
```

The server starts at `http://localhost:3000`. On first run, the database is **automatically created and seeded** with 3 users and 20 sample financial records — so you can start testing immediately.

---

## Default Login Credentials

These accounts are seeded automatically when the server starts for the first time.

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@finance.com | Admin@123 |
| **Analyst** | analyst@finance.com | Analyst@123 |
| **Viewer** | viewer@finance.com | Viewer@123 |

---

## Live API

- **Base URL:** `https://finance-backend-u9vd.onrender.com`
- **Health Check:** `https://finance-backend-u9vd.onrender.com/api/health`

---

## API Reference

Every response from the API follows the same shape so it's easy to work with:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { },
  "meta": { "total": 20, "page": 1, "limit": 20, "totalPages": 1 },
  "errors": ["validation error if any"]
}
```

---

### Authentication

#### Login — `POST /api/auth/login`

Send your email and password, get back a token.

```json
{ "email": "admin@finance.com", "password": "Admin@123" }
```

Response includes a JWT token and your user profile. Use this token in the `Authorization` header for all other requests:

```
Authorization: Bearer <your-token-here>
```

#### My Profile — `GET /api/auth/me`
Returns the currently logged-in user's details.

---

### User Management *(Admin only)*

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/api/users` | List all users with optional filters |
| GET | `/api/users/:id` | Get a specific user |
| POST | `/api/users` | Create a new user |
| PUT | `/api/users/:id` | Update user details |
| PATCH | `/api/users/:id/status` | Activate or deactivate a user |
| DELETE | `/api/users/:id` | Remove a user permanently |

You can filter the user list by role or status: `/api/users?role=analyst&status=active`

To create a user, send:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Secret@123",
  "role": "analyst"
}
```
Valid roles are `admin`, `analyst`, and `viewer`.

---

### Financial Records

| Method | Endpoint | Who can access | What it does |
|--------|----------|----------------|-------------|
| GET | `/api/records` | Everyone | List records with filters and pagination |
| GET | `/api/records/:id` | Everyone | Get a single record |
| POST | `/api/records` | Admin only | Create a new record |
| PUT | `/api/records/:id` | Admin only | Update a record |
| DELETE | `/api/records/:id` | Admin only | Soft-delete a record |

**Filtering options for GET /api/records:**

You can combine any of these filters in the URL:
- `type` — filter by `income` or `expense`
- `category` — partial text match on category name
- `date_from` and `date_to` — date range in `YYYY-MM-DD` format
- `search` — searches across notes and category
- `sort` — sort by `date`, `amount`, `category`, `type`, or `created_at`
- `order` — `asc` or `desc`
- `page` and `limit` — for pagination

To create a record:
```json
{
  "amount": 2500.00,
  "type": "income",
  "category": "Sales",
  "date": "2026-03-15",
  "notes": "Q1 product revenue"
}
```

---

### Dashboard Analytics

These endpoints are designed to power a real finance dashboard frontend.

| Endpoint | Who can access | What it returns |
|----------|----------------|----------------|
| `GET /api/dashboard/summary` | Everyone | Total income, expenses, and net balance |
| `GET /api/dashboard/recent` | Everyone | Most recent transactions |
| `GET /api/dashboard/by-category` | Analyst + Admin | Spending/income broken down by category |
| `GET /api/dashboard/trends` | Analyst + Admin | Monthly or weekly income vs expense trends |

**Sample summary response:**
```json
{
  "total_income": 58016.69,
  "total_expenses": 54128.08,
  "net_balance": 3888.61,
  "record_count": 20,
  "balance_status": "surplus"
}
```

For trends, you can pass `?period=monthly` or `?period=weekly` and optionally a `?year=2026`.

---

### Health Check

`GET /api/health` — No login required. Just confirms the server is up and running.

---

## Who Can Do What

This is the full access control matrix for the system:

| Action | Viewer | Analyst | Admin |
|--------|--------|---------|-------|
| Login and view own profile | ✅ | ✅ | ✅ |
| View financial records | ✅ | ✅ | ✅ |
| View dashboard summary | ✅ | ✅ | ✅ |
| View recent activity | ✅ | ✅ | ✅ |
| View category breakdown | ❌ | ✅ | ✅ |
| View trends | ❌ | ✅ | ✅ |
| Create, update, delete records | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Change user status | ❌ | ❌ | ✅ |

If a user tries to access something their role doesn't allow, they get a clear `403 Forbidden` response explaining what role is required.

---

## Running the Tests

```bash
node tests/integration.test.js
```

The test suite runs **50 automated assertions** covering every major part of the system — no test framework needed. Here's what it tests:

- Login with correct and wrong credentials
- Token verification and expiry handling
- All user CRUD operations
- Role enforcement (viewer and analyst blocked from admin actions)
- Financial record creation, filtering, updating, and soft delete
- Dashboard summary math (verifies net balance = income - expenses)
- Category breakdown and trend endpoints
- Validation errors for bad input
- 404 handling for missing resources

Expected output:
```
🧪  Finance Backend — Integration Test Suite

📌  Auth
  ✅  POST /auth/login — admin gets 200
  ✅  Login response has token
  ...

  Total: 50 | ✅ Passed: 50 | ❌ Failed: 0
```

---

## Design Decisions and Assumptions

Here are the key decisions I made and why:

**Zero external dependencies** — The whole backend runs on Node.js built-ins. This means no `npm install`, no version conflicts, and it runs anywhere Node.js runs. It also demonstrates understanding of how things like Express and JWT libraries work internally.

**Manual JWT implementation** — I implemented JWT signing and verification using `crypto.createHmac`. It's functionally identical to what the `jsonwebtoken` package does. Tokens expire after 24 hours.

**PBKDF2 password hashing** — Passwords are hashed using `crypto.pbkdf2Sync` with a random 16-byte salt and 10,000 iterations. This gives equivalent security to bcrypt at cost factor 10, with no external dependency.

**Soft deletes for financial records** — When a record is deleted, it gets marked with `is_deleted: true` rather than being removed from the database. This preserves the audit trail, which is important in any finance system. Soft-deleted records are invisible to all API responses.

**JSON file as the database** — The `data/db.json` file acts as a lightweight database. The database module exposes a clean `find / findOne / insert / update / delete` interface, so swapping to PostgreSQL later would only require changing `src/database.js`. All controllers stay the same.

**In-memory rate limiting** — Auth endpoints are limited to 20 requests per 15 minutes per IP. All other endpoints allow 100 requests per 15 minutes. This prevents brute force attacks on the login endpoint.

**Pagination everywhere** — All list endpoints support `page` and `limit` parameters. Default is page 1 with 20 results. Maximum is 100 per page.

**What would change in a production system** — I would replace the JSON file with PostgreSQL, add refresh tokens and token revocation, use structured logging with log levels, manage secrets through environment variables or a vault, and add database migrations. The application structure would stay exactly the same.
