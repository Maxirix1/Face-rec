const gate = document.getElementById('gate');
const app = document.getElementById('app');
const tokenInput = document.getElementById('token');
const gateError = document.getElementById('gate-error');
const statusEl = document.getElementById('status');
const alertsEl = document.getElementById('alerts');
const streamFrame = document.getElementById('stream-frame');
const livePill = document.getElementById('live-pill');

const TOKEN_KEY = 'home-guard-family-token';

function token() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function authHeaders() {
  return { Authorization: `Bearer ${token()}` };
}

async function api(path) {
  const res = await fetch(path, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function renderAlerts(alerts) {
  if (!alerts.length) {
    alertsEl.innerHTML = '<li style="display:block;padding:16px;color:#93a0b8">ยังไม่มีแจ้งเตือน</li>';
    return;
  }
  alertsEl.innerHTML = alerts.map((a) => {
    const when = new Date(a.createdAt).toLocaleString('th-TH');
    const kind = a.type === 'known' ? 'tag-known' : 'tag-unknown';
    const title = a.type === 'known' ? `คนในบ้าน · ${a.label}` : `คนแปลกหน้า · ${a.label}`;
    const img = a.snapshotUrl
      ? `<img src="${a.snapshotUrl}?token=${encodeURIComponent(token())}" alt="" />`
      : '<img alt="" />';
    return `<li>${img}<div>
      <h3 class="${kind}">${title}</h3>
      <p>${a.message || ''}</p>
      <p>${when}</p>
    </div></li>`;
  }).join('');
}

function connectEvents() {
  const es = new EventSource(`/api/events?token=${encodeURIComponent(token())}`);
  statusEl.textContent = 'live';
  statusEl.className = 'pill ok';
  es.onmessage = (ev) => {
    try {
      const alert = JSON.parse(ev.data);
      statusEl.textContent = alert.type === 'unknown' ? 'ALERT' : 'update';
      statusEl.className = alert.type === 'unknown' ? 'pill alert' : 'pill ok';
      if (navigator.vibrate) navigator.vibrate(80);
      loadAlerts();
    } catch {
      /* ignore */
    }
  };
  es.onerror = () => {
    statusEl.textContent = 'reconnecting…';
    statusEl.className = 'pill';
  };
  return es;
}

async function loadAlerts() {
  const data = await api('/api/alerts');
  renderAlerts(data.alerts || []);
}

async function enter() {
  const value = tokenInput.value.trim();
  if (!value) return;
  localStorage.setItem(TOKEN_KEY, value);
  try {
    await api('/api/config');
    gate.hidden = true;
    app.hidden = false;
    // MediaMTX WebRTC page (proxied later) — for now point to same-origin helper path
    streamFrame.src = `/webrtc.html?token=${encodeURIComponent(value)}`;
    livePill.textContent = 'เชื่อมแล้ว · รอภาพจาก Pi';
    await loadAlerts();
    connectEvents();
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    gateError.hidden = false;
    gateError.textContent = 'Token ไม่ถูกต้อง';
  }
}

document.getElementById('enter').addEventListener('click', enter);
tokenInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') enter();
});
document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  location.reload();
});
document.getElementById('refresh').addEventListener('click', () => {
  loadAlerts().catch(() => {});
});

if (token()) {
  tokenInput.value = token();
  enter();
}
