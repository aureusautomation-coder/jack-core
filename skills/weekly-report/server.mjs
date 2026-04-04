import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 18812;
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const DEFAULT_CONFIG = {
  companyName: 'Your Business',
  ownerName: 'Boss',
  timezone: 'Asia/Singapore',
  reportDay: 1, // Monday
  reportTime: '08:00',
  accentColor: '#f59e0b',
};

function loadConfig() {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) }; }
  catch { return { ...DEFAULT_CONFIG }; }
}
function saveConfig(c) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2)); }

async function fetchJSON(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

function weekRange() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - end.getDay()); // Last Sunday
  const start = new Date(end);
  start.setDate(start.getDate() - 6); // Previous Monday
  const fmt = d => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end), label: `${fmt(start)} to ${fmt(end)}` };
}

function currentMonth() { return new Date().toISOString().slice(0, 7); }

async function gatherData() {
  const week = weekRange();
  const sections = {};

  // Expenses
  try {
    const data = await fetchJSON(`http://127.0.0.1:18810/expenses/summary?month=${currentMonth()}`);
    sections.expenses = { available: true, ...data };
  } catch (e) { sections.expenses = { available: false, note: e.message }; }

  // Calendar
  try {
    const data = await fetchJSON('http://127.0.0.1:18803/events');
    sections.calendar = { available: true, events: data.events || data, count: (data.events || data).length };
  } catch (e) { sections.calendar = { available: false, note: e.message }; }

  // Notes
  try {
    const data = await fetchJSON('http://127.0.0.1:18809/notes');
    sections.notes = { available: true, count: data.length, recent: data.slice(0, 5) };
  } catch (e) { sections.notes = { available: false, note: e.message }; }

  return { week, sections, generatedAt: new Date().toISOString() };
}

function buildHTML(data, config) {
  const { week, sections } = data;
  const accent = config.accentColor || '#f59e0b';

  let expenseRows = '';
  if (sections.expenses?.available && sections.expenses.expenses?.length) {
    for (const e of sections.expenses.expenses.slice(0, 20)) {
      expenseRows += `<tr><td>${e.date}</td><td>${e.description || '-'}</td><td>${e.category}</td><td style="text-align:right">${e.currency} ${e.amount.toFixed(2)}</td></tr>`;
    }
  }

  let categoryRows = '';
  if (sections.expenses?.available && sections.expenses.byCategory) {
    for (const [cat, amt] of Object.entries(sections.expenses.byCategory).sort((a, b) => b[1] - a[1])) {
      const pct = sections.expenses.total > 0 ? ((amt / sections.expenses.total) * 100).toFixed(0) : 0;
      categoryRows += `<tr><td style="text-transform:capitalize">${cat}</td><td style="text-align:right">SGD ${amt.toFixed(2)}</td><td style="text-align:right">${pct}%</td></tr>`;
    }
  }

  let calendarRows = '';
  if (sections.calendar?.available && sections.calendar.events?.length) {
    for (const ev of sections.calendar.events.slice(0, 15)) {
      calendarRows += `<tr><td>${ev.date || '-'}</td><td>${ev.time || '-'}</td><td>${ev.title || ev.name || '-'}</td></tr>`;
    }
  }

  let notesList = '';
  if (sections.notes?.available && sections.notes.recent?.length) {
    for (const n of sections.notes.recent) {
      notesList += `<li><strong>${n.title || 'Untitled'}</strong> — ${n.content?.slice(0, 80) || ''}${n.content?.length > 80 ? '...' : ''}</li>`;
    }
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; font-size: 13px; line-height: 1.6; }
  .header { background: ${accent}; color: #0f0f1a; padding: 30px 40px; }
  .header h1 { font-size: 24px; font-weight: 800; }
  .header p { font-size: 13px; opacity: 0.8; margin-top: 4px; }
  .content { padding: 30px 40px; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 16px; font-weight: 700; color: ${accent}; border-bottom: 2px solid ${accent}; padding-bottom: 6px; margin-bottom: 12px; }
  .stat-row { display: flex; gap: 20px; margin-bottom: 20px; }
  .stat-box { flex: 1; background: #f8f8fc; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-box .num { font-size: 28px; font-weight: 800; color: ${accent}; }
  .stat-box .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f0f0f5; text-align: left; padding: 8px 10px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  tr:hover { background: #fafafa; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; }
  .footer { padding: 20px 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; }
  .empty { color: #999; font-style: italic; }
</style></head><body>

<div class="header">
  <h1>${config.companyName} — Weekly Report</h1>
  <p>${week.label} | Generated ${new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: config.timezone })}</p>
</div>

<div class="content">

  <div class="stat-row">
    <div class="stat-box">
      <div class="num">${sections.expenses?.available ? 'SGD ' + (sections.expenses.total || 0).toFixed(0) : '-'}</div>
      <div class="label">Total Expenses (${sections.expenses?.month || 'this month'})</div>
    </div>
    <div class="stat-box">
      <div class="num">${sections.expenses?.available ? sections.expenses.count || 0 : '-'}</div>
      <div class="label">Transactions</div>
    </div>
    <div class="stat-box">
      <div class="num">${sections.calendar?.available ? sections.calendar.count || 0 : '-'}</div>
      <div class="label">Calendar Events</div>
    </div>
    <div class="stat-box">
      <div class="num">${sections.notes?.available ? sections.notes.count || 0 : '-'}</div>
      <div class="label">Notes Saved</div>
    </div>
  </div>

  <div class="section">
    <h2>Expense Summary by Category</h2>
    ${categoryRows ? `<table><thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">%</th></tr></thead><tbody>${categoryRows}</tbody></table>` : '<p class="empty">No expenses recorded this month.</p>'}
  </div>

  <div class="section">
    <h2>Recent Expenses</h2>
    ${expenseRows ? `<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right">Amount</th></tr></thead><tbody>${expenseRows}</tbody></table>` : '<p class="empty">No expenses recorded.</p>'}
  </div>

  <div class="section">
    <h2>Calendar Overview</h2>
    ${calendarRows ? `<table><thead><tr><th>Date</th><th>Time</th><th>Event</th></tr></thead><tbody>${calendarRows}</tbody></table>` : '<p class="empty">No upcoming events.</p>'}
  </div>

  <div class="section">
    <h2>Recent Notes</h2>
    ${notesList ? `<ul>${notesList}</ul>` : '<p class="empty">No notes saved yet.</p>'}
  </div>

</div>

<div class="footer">
  Generated by Aria AI — Your AI Chief of Staff | ${config.companyName}
</div>

</body></html>`;
}

async function generateReport(config) {
  const data = await gatherData();
  const html = buildHTML(data, config);

  // Send to PDF service
  const pdfRes = await fetch('http://127.0.0.1:18802/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, title: `weekly-report-${data.week.start}` }),
  });
  if (!pdfRes.ok) throw new Error(`PDF service: ${await pdfRes.text()}`);
  const pdf = await pdfRes.json();

  return { ...data, pdf };
}

// ── HTTP Server ──
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const method = req.method;

  try {
    if (method === 'GET' && path === '/report') {
      const config = loadConfig();
      const result = await generateReport(config);
      json(res, 200, result);
    } else if (method === 'GET' && path === '/report/config') {
      json(res, 200, loadConfig());
    } else if (method === 'POST' && path === '/report/config') {
      const body = await parseBody(req);
      const config = { ...loadConfig(), ...body };
      saveConfig(config);
      json(res, 200, { ok: true, config });
    } else if (method === 'GET' && path === '/health') {
      json(res, 200, { status: 'ok', service: 'weekly-report', port: PORT });
    } else {
      json(res, 404, { error: 'Not found' });
    }
  } catch (err) {
    console.error('Error:', err.message);
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`📊 Weekly Report on port ${PORT}`));
