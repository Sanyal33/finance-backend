# Finance Data Processing and Access Control Backend

A clean, well-structured REST API backend for a finance dashboard system, built with **pure Node.js** (zero external dependencies). It supports role-based access control, financial record management, and dashboard analytics.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Default Credentials](#default-credentials)
- [API Reference](#api-reference)
- [Access Control Matrix](#access-control-matrix)
- [Design Decisions & Assumptions](#design-decisions--assumptions)
- [Running Tests](#running-tests)

---

## Tech Stack

| Layer        | Choice                              | Reason                                        |
|--------------|-------------------------------------|-----------------------------------------------|
| Runtime      | Node.js (built-ins only)            | No npm install needed, portable, zero-dep     |
| HTTP         | `node:http` + custom Router         | Lightweight, shows architecture thinking      |
| Auth         | HMAC-SHA256 JWT (manual)            | No `jsonwebtoken` dependency                  |
| Passwords    | PBKDF2 via `node:crypto`            | Secure hashing, no `bcrypt` needed            |
| Database     | JSON file (`data/db.json`)          | Self-contained, easy to inspect               |
| Tests        | Custom Node.js test runner          | No Jest/Mocha dependency                      |

> **Note:** The JSON file store simulates a database. In production, replace `src/database.js` with a PostgreSQL/MySQL/MongoDB adapter — all business logic in controllers/services remains unchanged.

---

## Project Structure

```
finance-backend/
├── app.js                          # App wiring: routes, middleware
├── index.js                        # Server entry point
├── data/
│   └── db.json                     # JSON persistence (auto-created on first run)
├── src/
│   ├── router.js                   # Custom HTTP router (supports :params)
│   ├── database.js                 # DB layer (read/write/query JSON store)
│   ├── controllers/
│   │   ├── authController.js       # Login, /me
│   │   ├── userController.js       # User CRUD
│   │   ├── recordController.js     # Financial records CRUD
│   │   └── dashboardController.js  # Analytics & summary APIs
│   ├── middleware/
│   │   ├── auth.js                 # JWT authenticate + role authorize
│   │   ├── bodyParser.js           # JSON body parsing (replaces express.json)
│   │   ├── logger.js               # Coloured request logger
│   │   └── rateLimiter.js          # In-memory rate limiting per IP
│   └── utils/
│       ├── auth.js                 # hashPassword, verifyPassword, signJWT, verifyJWT
│       ├── response.js             # Standardized HTTP response helpers
│       └── validators.js           # Input validation functions
└── tests/
    └── integration.test.js         # 50-assertion integration test suite
```

---

## Quick Start

```bash
# Clone / unzip the project
cd finance-backend

# No npm install needed — zero external dependencies!

# Start the server
node index.js

# Server runs at http://localhost:3000
```

The database is **auto-seeded** on first run with 3 users and 20 sample financial records.

---

## Default Credentials

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@finance.com      | Admin@123   |
| Analyst | analyst@finance.com    | Analyst@123 |
| Viewer  | viewer@finance.com     | Viewer@123  |

---

## API Reference

All responses follow a consistent shape:
```json
{
  "success": true | false,
  "message": "Human readable message",
  "data": { ... } | [...],
  "meta": { "total": 20, "page": 1, "limit": 20, "totalPages": 1 },
  "errors": ["field error 1", "field error 2"]
}
```

### Authentication

#### `POST /api/auth/login`
Exchange credentials for a JWT token.

**Request:**
```json
{ "email": "admin@finance.com", "password": "Admin@123" }
```
**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "...", "name": "Super Admin", "role": "admin", "status": "active" }
  }
}
```

#### `GET /api/auth/me`
Returns the authenticated user's profile.  
**Headers:** `Authorization: Bearer <token>`

---

### Users `[Admin only]`

| Method   | Endpoint                  | Description                       |
|----------|---------------------------|-----------------------------------|
| GET      | `/api/users`              | List all users (paginated)        |
| GET      | `/api/users/:id`          | Get single user                   |
| POST     | `/api/users`              | Create a user                     |
| PUT      | `/api/users/:id`          | Update user (name, email, role)   |
| PATCH    | `/api/users/:id/status`   | Set active / inactive             |
| DELETE   | `/api/users/:id`          | Delete user                       |

**Query params for GET /api/users:** `role`, `status`, `page`, `limit`

**POST /api/users body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Secret@123",
  "role": "analyst"
}
```
Valid roles: `admin`, `analyst`, `viewer`

---

### Financial Records

| Method   | Endpoint          | Roles allowed            | Description               |
|----------|-------------------|--------------------------|---------------------------|
| GET      | `/api/records`    | admin, analyst, viewer   | List records (paginated)  |
| GET      | `/api/records/:id`| admin, analyst, viewer   | Get single record         |
| POST     | `/api/records`    | admin                    | Create record             |
| PUT      | `/api/records/:id`| admin                    | Update record             |
| DELETE   | `/api/records/:id`| admin                    | Soft-delete record        |

**Query params for GET /api/records:**
- `type` — `income` or `expense`
- `category` — partial match
- `date_from`, `date_to` — format `YYYY-MM-DD`
- `search` — searches notes and category
- `sort` — `date`, `amount`, `category`, `type`, `created_at`
- `order` — `asc` or `desc`
- `page`, `limit`

**POST /api/records body:**
```json
{
  "amount": 2500.00,
  "type": "income",
  "category": "Sales",
  "date": "2026-03-15",
  "notes": "Q1 product sales"
}
```

---

### Dashboard Analytics

| Method | Endpoint                      | Roles allowed          | Description                    |
|--------|-------------------------------|------------------------|--------------------------------|
| GET    | `/api/dashboard/summary`      | admin, analyst, viewer | Total income, expenses, net    |
| GET    | `/api/dashboard/recent`       | admin, analyst, viewer | Recent transactions            |
| GET    | `/api/dashboard/by-category`  | admin, analyst         | Category-wise totals           |
| GET    | `/api/dashboard/trends`       | admin, analyst         | Monthly or weekly trends       |

**GET /api/dashboard/summary** query params: `date_from`, `date_to`

**GET /api/dashboard/trends** query params: `period` (`monthly` | `weekly`), `year`

**Sample summary response:**
```json
{
  "data": {
    "total_income": 58016.69,
    "total_expenses": 54128.08,
    "net_balance": 3888.61,
    "record_count": 20,
    "balance_status": "surplus"
  }
}
```

---

### Health

`GET /api/health` — No auth required. Returns server status and version.

---

## Access Control Matrix

| Action                        | Viewer | Analyst | Admin |
|-------------------------------|--------|---------|-------|
| Login / view own profile      | ✅     | ✅      | ✅    |
| View financial records        | ✅     | ✅      | ✅    |
| View dashboard summary        | ✅     | ✅      | ✅    |
| View recent activity          | ✅     | ✅      | ✅    |
| View category breakdown       | ❌     | ✅      | ✅    |
| View trends                   | ❌     | ✅      | ✅    |
| Create / update / delete records | ❌  | ❌      | ✅    |
| Create / update / delete users | ❌   | ❌      | ✅    |
| Change user status            | ❌     | ❌      | ✅    |

---

## Running Tests

```bash
node tests/integration.test.js
```

The test suite covers **50 assertions** across:
- Auth (login success, failure, missing fields, token verification)
- User CRUD (create, read, update, delete, status change, duplicate email)
- Role enforcement (viewer/analyst blocked from admin actions)
- Financial records (CRUD, filters, soft delete, validation)
- Dashboard analytics (summary math, category breakdown, trends, recent activity)
- Edge cases (404 for unknown routes, missing resources)

Sample output:
```
🧪  Finance Backend — Integration Test Suite

📌  Auth
  ✅  POST /auth/login — admin gets 200
  ✅  Login response has token
  ...

  Total: 50 | ✅ Passed: 50 | ❌ Failed: 0
```

---

## Design Decisions & Assumptions

### 1. Zero External Dependencies
The entire backend runs on Node.js built-ins (`http`, `crypto`, `fs`, `url`). This demonstrates understanding of how frameworks like Express work under the hood, and makes the project trivially portable.

### 2. Custom JWT (HMAC-SHA256)
JWT is implemented manually using `crypto.createHmac`. This is functionally identical to what `jsonwebtoken` does internally. Token expiry is 24 hours.

### 3. Password Hashing (PBKDF2)
Passwords are hashed using `crypto.pbkdf2Sync` with a random 16-byte salt and 10,000 iterations — equivalent security to bcrypt at cost 10.

### 4. JSON File as Database
`data/db.json` acts as the persistence layer. The `database.js` module provides a clean `find / findOne / insert / update / delete` interface. Swapping to Postgres requires only changing that one file.

### 5. Soft Deletes for Records
Financial records are never permanently removed — `is_deleted: true` is set instead. This preserves audit history, a common requirement in finance systems.

### 6. Role Assumptions
- **Viewer**: Read-only access to records and basic dashboard summary.
- **Analyst**: All viewer access + advanced analytics (category breakdown, trends).
- **Admin**: Full access — manage users and records.

### 7. Pagination
All list endpoints support `page` and `limit` query parameters with sane defaults (page 1, limit 20, max 100).

### 8. Rate Limiting
An in-memory rate limiter restricts auth endpoints to 20 requests per 15 minutes per IP, and all other endpoints to 100 requests per 15 minutes.

### 9. What Would Change in Production
- Replace JSON file store with PostgreSQL + connection pool
- Use HTTPS / TLS termination at the load balancer
- Add refresh tokens and token revocation
- Add structured logging (e.g., Pino/Winston) with log levels
- Add proper secret management (env vars via `.env` / Vault)
- Add database migrations
