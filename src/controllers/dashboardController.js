/**
 * Dashboard Controller
 *
 * GET /api/dashboard/summary         — totals, net balance        [all roles]
 * GET /api/dashboard/by-category     — category-wise breakdown    [analyst, admin]
 * GET /api/dashboard/trends          — monthly/weekly trends      [analyst, admin]
 * GET /api/dashboard/recent          — recent transactions        [all roles]
 */

const { sendSuccess } = require("../utils/response");
const { db } = require("../database");

// Helper: get active (non-deleted) records
function getActiveRecords() {
  return db.find("financial_records", (r) => !r.is_deleted);
}

// ── Summary ───────────────────────────────────────────────────────────────
function getSummary(req, res) {
  const { date_from, date_to } = req.query;
  let records = getActiveRecords();

  if (date_from) records = records.filter((r) => r.date >= date_from);
  if (date_to) records = records.filter((r) => r.date <= date_to);

  const totalIncome = records
    .filter((r) => r.type === "income")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpenses = records
    .filter((r) => r.type === "expense")
    .reduce((sum, r) => sum + r.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  const incomeCount = records.filter((r) => r.type === "income").length;
  const expenseCount = records.filter((r) => r.type === "expense").length;

  return sendSuccess(
    res,
    {
      total_income: round2(totalIncome),
      total_expenses: round2(totalExpenses),
      net_balance: round2(netBalance),
      record_count: records.length,
      income_count: incomeCount,
      expense_count: expenseCount,
      balance_status: netBalance >= 0 ? "surplus" : "deficit",
      filters_applied: { date_from: date_from || null, date_to: date_to || null },
    },
    "Dashboard summary fetched"
  );
}

// ── Category Breakdown ────────────────────────────────────────────────────
function getByCategory(req, res) {
  const { type, date_from, date_to } = req.query;
  let records = getActiveRecords();

  if (type) records = records.filter((r) => r.type === type);
  if (date_from) records = records.filter((r) => r.date >= date_from);
  if (date_to) records = records.filter((r) => r.date <= date_to);

  const categoryMap = {};
  for (const r of records) {
    if (!categoryMap[r.category]) {
      categoryMap[r.category] = { category: r.category, total: 0, count: 0, income: 0, expense: 0 };
    }
    categoryMap[r.category].total += r.amount;
    categoryMap[r.category].count++;
    categoryMap[r.category][r.type] += r.amount;
  }

  const categories = Object.values(categoryMap)
    .map((c) => ({ ...c, total: round2(c.total), income: round2(c.income), expense: round2(c.expense) }))
    .sort((a, b) => b.total - a.total);

  return sendSuccess(res, categories, "Category breakdown fetched");
}

// ── Monthly/Weekly Trends ─────────────────────────────────────────────────
function getTrends(req, res) {
  const { period = "monthly", year } = req.query;
  let records = getActiveRecords();

  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
  records = records.filter((r) => r.date.startsWith(String(targetYear)));

  if (period === "monthly") {
    const months = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${targetYear}-${String(m).padStart(2, "0")}`;
      months[key] = { period: key, income: 0, expense: 0, net: 0, count: 0 };
    }

    for (const r of records) {
      const key = r.date.slice(0, 7); // YYYY-MM
      if (months[key]) {
        months[key][r.type] += r.amount;
        months[key].count++;
      }
    }

    const result = Object.values(months).map((m) => ({
      ...m,
      income: round2(m.income),
      expense: round2(m.expense),
      net: round2(m.income - m.expense),
    }));

    return sendSuccess(res, result, "Monthly trends fetched");
  }

  // Weekly (last 12 weeks)
  const weeks = {};
  for (const r of records) {
    const week = getISOWeek(new Date(r.date));
    const key = `${targetYear}-W${String(week).padStart(2, "0")}`;
    if (!weeks[key]) weeks[key] = { period: key, income: 0, expense: 0, net: 0, count: 0 };
    weeks[key][r.type] += r.amount;
    weeks[key].count++;
  }

  const result = Object.values(weeks)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((w) => ({
      ...w,
      income: round2(w.income),
      expense: round2(w.expense),
      net: round2(w.income - w.expense),
    }));

  return sendSuccess(res, result, "Weekly trends fetched");
}

// ── Recent Activity ───────────────────────────────────────────────────────
function getRecentActivity(req, res) {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const records = getActiveRecords()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  return sendSuccess(res, records, "Recent activity fetched");
}

// ── Helpers ───────────────────────────────────────────────────────────────
function round2(n) {
  return Math.round(n * 100) / 100;
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

module.exports = { getSummary, getByCategory, getTrends, getRecentActivity };
