import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 18810;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadExpenses() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveExpenses(expenses) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(expenses, null, 2));
}

let expenses = loadExpenses();

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function respond(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function parseQuery(url) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const params = {};
  const search = url.slice(idx + 1);
  for (const pair of search.split('&')) {
    const [key, val] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(val || '');
  }
  return params;
}

function getPathname(url) {
  const idx = url.indexOf('?');
  return idx === -1 ? url : url.slice(0, idx);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handlePostExpense(req, res) {
  let body;
  try {
    body = await parseBody(req);
  } catch {
    return respond(res, 400, { error: 'Invalid JSON body' });
  }

  if (body.amount == null || isNaN(Number(body.amount))) {
    return respond(res, 400, { error: 'amount is required and must be a number' });
  }

  const expense = {
    id: generateId(),
    amount: Number(body.amount),
    currency: (body.currency || 'SGD').toUpperCase(),
    category: (body.category || 'general').toLowerCase(),
    description: body.description || '',
    date: body.date || todayISO(),
    createdAt: new Date().toISOString(),
  };

  expenses.push(expense);
  saveExpenses(expenses);
  respond(res, 201, expense);
}

function handleGetExpenses(req, res) {
  const q = parseQuery(req.url);
  let result = [...expenses];

  if (q.month) {
    result = result.filter((e) => e.date && e.date.startsWith(q.month));
  }
  if (q.category) {
    result = result.filter((e) => e.category === q.category.toLowerCase());
  }

  // Sort by date descending
  result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const limit = parseInt(q.limit, 10) || 50;
  result = result.slice(0, limit);

  respond(res, 200, result);
}

function handleGetSummary(req, res) {
  const q = parseQuery(req.url);
  const month = q.month || currentMonth();

  const monthExpenses = expenses
    .filter((e) => e.date && e.date.startsWith(month))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const byCategory = {};
  let total = 0;

  for (const e of monthExpenses) {
    total += e.amount;
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  // Round to 2 decimals
  total = Math.round(total * 100) / 100;
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat] = Math.round(byCategory[cat] * 100) / 100;
  }

  respond(res, 200, {
    month,
    total,
    currency: 'SGD',
    count: monthExpenses.length,
    byCategory,
    expenses: monthExpenses,
  });
}

function handleDeleteExpense(res, id) {
  const idx = expenses.findIndex((e) => e.id === id);
  if (idx === -1) {
    return respond(res, 404, { error: 'Expense not found' });
  }
  const [removed] = expenses.splice(idx, 1);
  saveExpenses(expenses);
  respond(res, 200, { deleted: true, expense: removed });
}

function handleHealth(_req, res) {
  respond(res, 200, {
    status: 'ok',
    service: 'expense-tracker',
    expenseCount: expenses.length,
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const pathname = getPathname(req.url);
  const method = req.method.toUpperCase();

  try {
    // POST /expenses
    if (method === 'POST' && pathname === '/expenses') {
      return await handlePostExpense(req, res);
    }

    // GET /expenses/summary  (must be checked before /expenses/:id)
    if (method === 'GET' && pathname === '/expenses/summary') {
      return handleGetSummary(req, res);
    }

    // GET /expenses
    if (method === 'GET' && pathname === '/expenses') {
      return handleGetExpenses(req, res);
    }

    // DELETE /expenses/:id
    const deleteMatch = pathname.match(/^\/expenses\/([^/]+)$/);
    if (method === 'DELETE' && deleteMatch) {
      return handleDeleteExpense(res, deleteMatch[1]);
    }

    // GET /health
    if (method === 'GET' && pathname === '/health') {
      return handleHealth(req, res);
    }

    respond(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Unhandled error:', err);
    respond(res, 500, { error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

ensureDataDir();

server.listen(PORT, () => {
  console.log(`[expense-tracker] listening on port ${PORT}`);
  console.log(`[expense-tracker] data file: ${DATA_FILE}`);
});
