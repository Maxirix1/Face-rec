import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
const ALERTS_FILE = path.join(DATA, 'alerts.json');
const FAMILY_FILE = path.join(DATA, 'family-profiles.json');
const SNAP_DIR = path.join(DATA, 'snapshots');

mkdirSync(DATA, { recursive: true });
mkdirSync(SNAP_DIR, { recursive: true });

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const PORT = Number(process.env.PORT || 5191);
const FAMILY_TOKEN = process.env.FAMILY_TOKEN || 'family';
const PI_TOKEN = process.env.PI_TOKEN || 'pi';
const STREAM_VIEW_URL = process.env.STREAM_VIEW_URL || '/stream';
const ALERT_LIMIT = Number(process.env.ALERT_LIMIT || 50);

/** @type {import('node:http').ServerResponse[]} */
const sseClients = [];

function readAlerts() {
  try {
    return JSON.parse(readFileSync(ALERTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeAlerts(alerts) {
  writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

function readFamilyProfiles() {
  try {
    const raw = JSON.parse(readFileSync(FAMILY_FILE, 'utf8'));
    return Array.isArray(raw?.profiles) ? raw.profiles : [];
  } catch {
    return [];
  }
}

function writeFamilyProfiles(profiles) {
  writeFileSync(
    FAMILY_FILE,
    JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), profiles }, null, 2),
  );
}

function allowFamilyOrPi(req) {
  const token = getBearer(req) || getQueryToken(req.url || '');
  return token === FAMILY_TOKEN || token === PI_TOKEN;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...corsHeaders(),
  });
  res.end(payload);
}

function unauthorized(res) {
  json(res, 401, { error: 'Unauthorized' });
}

function getBearer(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return '';
}

function getQueryToken(url) {
  try {
    return new URL(url, 'http://local').searchParams.get('token') || '';
  } catch {
    return '';
  }
}

function broadcast(alert) {
  const data = `data: ${JSON.stringify(alert)}\n\n`;
  for (const client of [...sseClients]) {
    try {
      client.write(data);
    } catch {
      /* ignore */
    }
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

async function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const st = await fs.stat(filePath);
    if (st.isDirectory()) filePath = path.join(filePath, 'index.html');
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

async function handleAlertPost(req, res) {
  if (getBearer(req) !== PI_TOKEN) return unauthorized(res);

  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return json(res, 400, { error: 'Invalid JSON' });
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  let snapshotUrl = null;

  if (typeof body.snapshotBase64 === 'string' && body.snapshotBase64.startsWith('data:image/')) {
    const match = body.snapshotBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) {
      const ext = match[1].includes('png') ? 'png' : match[1].includes('webp') ? 'webp' : 'jpg';
      const name = `${id}.${ext}`;
      await fs.writeFile(path.join(SNAP_DIR, name), Buffer.from(match[2], 'base64'));
      snapshotUrl = `/api/snapshots/${name}`;
    }
  }

  const alert = {
    id,
    createdAt,
    type: body.type === 'known' ? 'known' : 'unknown',
    label: String(body.label || (body.type === 'known' ? 'คนในบ้าน' : 'คนแปลกหน้า')).slice(0, 80),
    message: String(body.message || '').slice(0, 240),
    streamPath: String(body.streamPath || 'cam1').slice(0, 40),
    snapshotUrl,
  };

  const alerts = [alert, ...readAlerts()].slice(0, ALERT_LIMIT);
  writeAlerts(alerts);
  broadcast(alert);
  json(res, 201, { ok: true, alert });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  // Proxy MediaMTX WebRTC/WHEP under /webrtc/*
  if (pathname === '/webrtc' || pathname.startsWith('/webrtc/')) {
    const targetPath = pathname === '/webrtc' ? '/' : pathname.replace(/^\/webrtc/, '') || '/';
    const headers = { ...req.headers, host: '127.0.0.1:8889' };
    delete headers['accept-encoding'];
    const proxy = http.request(
      {
        hostname: '127.0.0.1',
        port: 8889,
        path: targetPath + url.search,
        method: req.method,
        headers,
      },
      (up) => {
        res.writeHead(up.statusCode || 502, up.headers);
        up.pipe(res);
      },
    );
    proxy.on('error', () => {
      if (!res.headersSent) json(res, 502, { error: 'MediaMTX offline' });
    });
    req.pipe(proxy);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'home-guard' });
  }

  if (req.method === 'GET' && pathname === '/api/config') {
    const token = getBearer(req) || getQueryToken(req.url || '');
    if (token !== FAMILY_TOKEN) return unauthorized(res);
    return json(res, 200, {
      streamViewUrl: STREAM_VIEW_URL,
      webrtcPath: 'cam1',
    });
  }

  if (req.method === 'GET' && pathname === '/api/alerts') {
    const token = getBearer(req) || getQueryToken(req.url || '');
    if (token !== FAMILY_TOKEN) return unauthorized(res);
    return json(res, 200, { alerts: readAlerts() });
  }

  if (req.method === 'GET' && pathname === '/api/events') {
    const token = getBearer(req) || getQueryToken(req.url || '');
    if (token !== FAMILY_TOKEN) return unauthorized(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    sseClients.push(res);
    req.on('close', () => {
      const i = sseClients.indexOf(res);
      if (i >= 0) sseClients.splice(i, 1);
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/alerts') {
    return handleAlertPost(req, res);
  }

  // Shared family face roster — Pi + phones use the same list via VPS
  if (req.method === 'GET' && pathname === '/api/family') {
    if (!allowFamilyOrPi(req)) return unauthorized(res);
    return json(res, 200, { profiles: readFamilyProfiles() });
  }

  if (req.method === 'PUT' && pathname === '/api/family') {
    if (!allowFamilyOrPi(req)) return unauthorized(res);
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body;
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      return json(res, 400, { error: 'Invalid JSON' });
    }
    const profiles = Array.isArray(body.profiles) ? body.profiles : [];
    if (profiles.length > 40) return json(res, 400, { error: 'Too many profiles' });
    writeFamilyProfiles(profiles);
    return json(res, 200, { ok: true, count: profiles.length });
  }

  if (req.method === 'GET' && pathname.startsWith('/api/snapshots/')) {
    const token = getBearer(req) || getQueryToken(req.url || '');
    if (token !== FAMILY_TOKEN) return unauthorized(res);
    const name = path.basename(pathname);
    const file = path.join(SNAP_DIR, name);
    if (!file.startsWith(SNAP_DIR) || !existsSync(file)) return json(res, 404, { error: 'Not found' });
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'image/jpeg', 'Cache-Control': 'private, max-age=3600' });
    createReadStream(file).pipe(res);
    return;
  }

  // Family page needs token in query for simple mobile open
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    return serveStatic(req, res, '/');
  }

  if (req.method === 'GET') {
    return serveStatic(req, res, pathname);
  }

  res.writeHead(405).end('Method not allowed');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`home-guard listening on http://127.0.0.1:${PORT}`);
});
