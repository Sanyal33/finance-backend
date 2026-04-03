/**
 * Financial Records Controller
 *
 * GET    /api/records         — list records (with filters)  [admin, analyst, viewer]
 * GET    /api/records/:id     — single record                [admin, analyst, viewer]
 * POST   /api/records         — create record                [admin]
 * PUT    /api/records/:id     — update record                [admin]
 * DELETE /api/records/:id     — soft-delete record           [admin]
 */

const { validateCreateRecord, validateUpdateRecord } = require("../utils/validators");
const {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
} = require("../utils/response");
const { db } = require("../database");

function listRecords(req, res) {
  const {
    type,
    category,
    date_from,
    date_to,
    search,
    page = "1",
    limit = "20",
    sort = "date",
    order = "desc",
  } = req.query;

  // Viewers and analysts can see all (non-deleted) records
  let records = db.find("financial_records", (r) => !r.is_deleted);

  // Filters
  if (type) records = records.filter((r) => r.type === type);
  if (category) records = records.filter((r) =>
    r.category.toLowerCase().includes(category.toLowerCase())
  );
  if (date_from) records = records.filter((r) => r.date >= date_from);
  if (date_to) records = records.filter((r) => r.date <= date_to);
  if (search) {
    const q = search.toLowerCase();
    records = records.filter(
      (r) =>
        r.notes?.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }

  // Sorting
  const validSorts = ["date", "amount", "category", "type", "created_at"];
  const sortField = validSorts.includes(sort) ? sort : "date";
  records.sort((a, b) => {
    const va = a[sortField];
    const vb = b[sortField];
    if (va < vb) return order === "asc" ? -1 : 1;
    if (va > vb) return order === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const total = records.length;
  const totalPages = Math.ceil(total / limitNum);
  const paginated = records.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return sendSuccess(res, paginated, "Records fetched", 200, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  });
}

function getRecord(req, res) {
  const { id } = req.params;
  const record = db.findOne("financial_records", (r) => r.id === id && !r.is_deleted);
  if (!record) return sendNotFound(res, "Record not found");
  return sendSuccess(res, record, "Record fetched");
}

function createRecord(req, res) {
  const errors = validateCreateRecord(req.body);
  if (errors.length > 0) return sendBadRequest(res, "Validation failed", errors);

  const { amount, type, category, date, notes } = req.body;

  const record = db.insert("financial_records", {
    amount: parseFloat(Number(amount).toFixed(2)),
    type,
    category: category.trim(),
    date,
    notes: notes?.trim() || "",
    created_by: req.user.id,
    is_deleted: false,
  });

  return sendCreated(res, record, "Financial record created");
}

function updateRecord(req, res) {
  const { id } = req.params;
  const record = db.findOne("financial_records", (r) => r.id === id && !r.is_deleted);
  if (!record) return sendNotFound(res, "Record not found");

  const errors = validateUpdateRecord(req.body);
  if (errors.length > 0) return sendBadRequest(res, "Validation failed", errors);

  const { amount, type, category, date, notes } = req.body;
  const updates = {};

  if (amount !== undefined) updates.amount = parseFloat(Number(amount).toFixed(2));
  if (type !== undefined) updates.type = type;
  if (category !== undefined) updates.category = category.trim();
  if (date !== undefined) updates.date = date;
  if (notes !== undefined) updates.notes = notes.trim();

  const updated = db.update("financial_records", id, updates);
  return sendSuccess(res, updated, "Record updated");
}

function deleteRecord(req, res) {
  const { id } = req.params;
  const record = db.findOne("financial_records", (r) => r.id === id && !r.is_deleted);
  if (!record) return sendNotFound(res, "Record not found");

  // Soft delete
  db.update("financial_records", id, { is_deleted: true });
  return sendSuccess(res, null, "Record deleted (soft delete)");
}

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord };
