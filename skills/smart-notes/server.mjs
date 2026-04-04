import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 18809;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'notes.json');

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadNotes() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), 'utf-8');
}

let notes = loadNotes();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function json(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseUrl(url) {
  const parsed = new URL(url, `http://localhost:${PORT}`);
  return { pathname: parsed.pathname, searchParams: parsed.searchParams };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleCreateNote(req, res) {
  let body;
  try { body = await parseBody(req); }
  catch { return json(res, 400, { error: 'Invalid JSON body' }); }

  if (!body.content) return json(res, 400, { error: 'content is required' });

  const now = new Date().toISOString();
  const note = {
    id: generateId(),
    title: body.title || '',
    content: body.content,
    tags: Array.isArray(body.tags) ? body.tags : [],
    createdAt: now,
    updatedAt: now,
  };

  notes.push(note);
  saveNotes(notes);
  json(res, 201, note);
}

function handleListNotes(req, res) {
  const { searchParams } = parseUrl(req.url);
  const search = (searchParams.get('search') || '').toLowerCase();
  const tag = (searchParams.get('tag') || '').toLowerCase();

  let results = [...notes];

  if (search) {
    results = results.filter(
      (n) =>
        n.title.toLowerCase().includes(search) ||
        n.content.toLowerCase().includes(search),
    );
  }

  if (tag) {
    results = results.filter((n) =>
      n.tags.some((t) => t.toLowerCase() === tag),
    );
  }

  // Sort by updatedAt descending
  results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  json(res, 200, results);
}

function handleGetNote(res, id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return json(res, 404, { error: 'Note not found' });
  json(res, 200, note);
}

async function handleUpdateNote(req, res, id) {
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return json(res, 404, { error: 'Note not found' });

  let body;
  try { body = await parseBody(req); }
  catch { return json(res, 400, { error: 'Invalid JSON body' }); }

  if (body.title !== undefined) notes[idx].title = body.title;
  if (body.content !== undefined) notes[idx].content = body.content;
  if (body.tags !== undefined) notes[idx].tags = Array.isArray(body.tags) ? body.tags : notes[idx].tags;
  notes[idx].updatedAt = new Date().toISOString();

  saveNotes(notes);
  json(res, 200, notes[idx]);
}

function handleDeleteNote(res, id) {
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return json(res, 404, { error: 'Note not found' });

  const deleted = notes.splice(idx, 1)[0];
  saveNotes(notes);
  json(res, 200, { deleted: true, id: deleted.id });
}

function handleHealth(res) {
  json(res, 200, { status: 'ok', service: 'smart-notes', noteCount: notes.length });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const { pathname } = parseUrl(req.url);
  const method = req.method.toUpperCase();

  try {
    // Health
    if (pathname === '/health' && method === 'GET') {
      return handleHealth(res);
    }

    // POST /notes — create
    if (pathname === '/notes' && method === 'POST') {
      return await handleCreateNote(req, res);
    }

    // GET /notes — list (with optional search/tag)
    if (pathname === '/notes' && method === 'GET') {
      return handleListNotes(req, res);
    }

    // Routes with :id
    const idMatch = pathname.match(/^\/notes\/([^/]+)$/);
    if (idMatch) {
      const id = idMatch[1];
      if (method === 'GET') return handleGetNote(res, id);
      if (method === 'PUT') return await handleUpdateNote(req, res, id);
      if (method === 'DELETE') return handleDeleteNote(res, id);
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[smart-notes] Error:', err);
    json(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`[smart-notes] Listening on port ${PORT} — ${notes.length} note(s) loaded`);
});
