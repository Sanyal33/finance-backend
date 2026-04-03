/**
 * Database Layer — Pure Node.js, no external dependencies.
 * Uses a JSON file for persistence (simulates a lightweight DB).
 * In production this would be replaced by PostgreSQL / MySQL / MongoDB.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

// ── Schema ──────────────────────────────────────────────────────────────────
const DEFAULT_DB = {
  users: [],
  financial_records: [],
  sessions: [],
};

// ── Init ────────────────────────────────────────────────────────────────────
function initDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }

  // Seed default admin if no users exist
  const db = readDB();
  if (db.users.length === 0) {
    seedDefaults(db);
    writeDB(db);
  }
}

function seedDefaults(db) {
  const { hashPassword } = require("./utils/auth");

  db.users.push(
    {
      id: generateId(),
      name: "Super Admin",
      email: "admin@finance.com",
      password: hashPassword("Admin@123"),
      role: "admin",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "Alice Analyst",
      email: "analyst@finance.com",
      password: hashPassword("Analyst@123"),
      role: "analyst",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "Victor Viewer",
      email: "viewer@finance.com",
      password: hashPassword("Viewer@123"),
      role: "viewer",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );

  // Seed some financial records
  const adminId = db.users[0].id;
  const categories = ["Salary", "Rent", "Utilities", "Marketing", "Sales", "Travel", "Equipment"];
  const types = ["income", "expense"];

  for (let i = 0; i < 20; i++) {
    const type = types[i % 2];
    const amount = parseFloat((Math.random() * 9000 + 1000).toFixed(2));
    const date = new Date();
    date.setDate(date.getDate() - i * 3);

    db.financial_records.push({
      id: generateId(),
      amount,
      type,
      category: categories[i % categories.length],
      date: date.toISOString().split("T")[0],
      notes: `${type === "income" ? "Revenue" : "Expense"} entry #${i + 1}`,
      created_by: adminId,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

// ── Read / Write ─────────────────────────────────────────────────────────────
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return { ...DEFAULT_DB };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
  return crypto.randomUUID();
}

// ── Table-level operations ───────────────────────────────────────────────────
const db = {
  // Generic find
  find(table, predicate) {
    const data = readDB();
    const rows = data[table] || [];
    return predicate ? rows.filter(predicate) : rows;
  },

  findOne(table, predicate) {
    const data = readDB();
    const rows = data[table] || [];
    return rows.find(predicate) || null;
  },

  insert(table, record) {
    const data = readDB();
    if (!data[table]) data[table] = [];
    const newRecord = {
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...record,
    };
    data[table].push(newRecord);
    writeDB(data);
    return newRecord;
  },

  update(table, id, updates) {
    const data = readDB();
    const index = (data[table] || []).findIndex((r) => r.id === id);
    if (index === -1) return null;
    data[table][index] = {
      ...data[table][index],
      ...updates,
      id, // prevent id overwrite
      updated_at: new Date().toISOString(),
    };
    writeDB(data);
    return data[table][index];
  },

  delete(table, id) {
    const data = readDB();
    const index = (data[table] || []).findIndex((r) => r.id === id);
    if (index === -1) return false;
    data[table].splice(index, 1);
    writeDB(data);
    return true;
  },

  generateId,
};

module.exports = { db, initDB };
