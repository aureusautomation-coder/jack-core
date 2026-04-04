import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 18811;
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  city: 'Singapore',
  timezone: 'Asia/Singapore',
  news_topics: ['technology', 'singapore'],
  briefing_time: '07:00',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch { /* fall through */ }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

/** Fetch with a 5-second timeout. Returns parsed JSON or throws. */
async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function formatDate(timezone) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date());
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseQuery(url) {
  const u = new URL(url, 'http://localhost');
  return Object.fromEntries(u.searchParams.entries());
}

// ---------------------------------------------------------------------------
// Source fetchers — each returns a section object
// ---------------------------------------------------------------------------

async function fetchCalendar() {
  try {
    const data = await fetchWithTimeout('http://127.0.0.1:18803/events/today');
    return { available: true, events: data.events ?? data };
  } catch (err) {
    return { available: false, events: [], note: `Calendar service unavailable: ${err.message}` };
  }
}

async function fetchWeather(city) {
  try {
    // Placeholder — swap in a real OpenWeatherMap call when an API key is configured
    const config = loadConfig();
    const targetCity = city || config.city || 'Singapore';

    // Attempt a local weather skill first (future)
    // For now return a helpful placeholder
    return {
      available: false,
      summary: `Weather data for ${targetCity} is not configured yet. Set OPENWEATHER_API_KEY to enable.`,
      city: targetCity,
      note: 'Placeholder — no weather API key configured',
    };
  } catch (err) {
    return { available: false, summary: '', note: `Weather fetch failed: ${err.message}` };
  }
}

async function fetchNews(limit = 5) {
  try {
    const data = await fetchWithTimeout(`http://127.0.0.1:18806/news?limit=${limit}`);
    return { available: true, headlines: data.headlines ?? data };
  } catch (err) {
    return { available: false, headlines: [], note: `News service unavailable: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleGetBriefing(req, res) {
  const query = parseQuery(req.url);
  const config = loadConfig();
  const timezone = query.timezone || config.timezone || 'Asia/Singapore';
  const city = query.city || config.city || 'Singapore';

  const [calendar, weather, news] = await Promise.all([
    fetchCalendar(),
    fetchWeather(city),
    fetchNews(5),
  ]);

  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(now),
  );

  let greetingPrefix = 'Good morning';
  if (hour >= 12 && hour < 17) greetingPrefix = 'Good afternoon';
  else if (hour >= 17) greetingPrefix = 'Good evening';

  const briefing = {
    date: formatDate(timezone),
    greeting: `${greetingPrefix}! Here's your daily briefing.`,
    sections: { calendar, weather, news },
    generated_at: now.toISOString(),
  };

  json(res, 200, briefing);
}

async function handlePostConfig(req, res) {
  try {
    const body = await readBody(req);
    const current = loadConfig();
    const merged = { ...current, ...body };
    saveConfig(merged);
    json(res, 200, { ok: true, config: merged });
  } catch (err) {
    json(res, 400, { ok: false, error: err.message });
  }
}

function handleGetConfig(_req, res) {
  json(res, 200, loadConfig());
}

function handleHealth(_req, res) {
  json(res, 200, { status: 'ok', service: 'daily-briefing', port: PORT });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  try {
    if (method === 'GET' && pathname === '/briefing') {
      await handleGetBriefing(req, res);
    } else if (method === 'POST' && pathname === '/briefing/config') {
      await handlePostConfig(req, res);
    } else if (method === 'GET' && pathname === '/briefing/config') {
      handleGetConfig(req, res);
    } else if (method === 'GET' && pathname === '/health') {
      handleHealth(req, res);
    } else {
      json(res, 404, { error: 'Not found' });
    }
  } catch (err) {
    console.error('Unhandled error:', err);
    json(res, 500, { error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

ensureDataDir();

server.listen(PORT, () => {
  console.log(`[daily-briefing] listening on http://127.0.0.1:${PORT}`);
});
