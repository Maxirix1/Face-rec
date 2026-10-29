import { createReadStream } from 'node:fs';
import { access, realpath, stat } from 'node:fs/promises';
import http from 'node:http';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareAssets, PROJECT_DIR } from './prepare-assets.js';

/** MediaMTX WebRTC/WHEP upstream (local Ubuntu). Override with MEDIAMTX_WHEP_ORIGIN. */
const MEDIAMTX_ORIGIN = process.env.MEDIAMTX_WHEP_ORIGIN || 'http://127.0.0.1:8889';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function isInside(directory, file) {
  const relative = path.relative(directory, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function respond(request, response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(request.method === 'HEAD' ? undefined : message);
}

function proxyMediaMtx(request, response, pathname) {
  let upstream;
  try {
    upstream = new URL(MEDIAMTX_ORIGIN);
  } catch {
    respond(request, response, 500, 'Invalid MEDIAMTX_WHEP_ORIGIN.');
    return;
  }
  const targetPath = pathname === '/webrtc' ? '/' : pathname.replace(/^\/webrtc/, '') || '/';
  const headers = { ...request.headers, host: upstream.host };
  delete headers['accept-encoding'];
  const proxy = http.request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
      path: targetPath + (request.url.includes('?') ? `?${request.url.split('?')[1]}` : ''),
      method: request.method,
      headers,
    },
    (up) => {
      response.writeHead(up.statusCode || 502, up.headers);
      up.pipe(response);
    },
  );
  proxy.on('error', () => {
    if (!response.headersSent) {
      respond(request, response, 502, 'MediaMTX offline — start MediaMTX and publish RTSP to cam1.');
    }
  });
  request.pipe(proxy);
}

/** Create a static server without listening; useful for tests and embedding. */
export function createStaticServer({ publicDir = path.join(PROJECT_DIR, 'dist') } = {}) {
  const root = path.resolve(publicDir);
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Permissions-Policy', 'camera=(self), microphone=()');

    let pathname;
    try {
      // Inspect the original path before URL normalization can erase dot segments.
      pathname = decodeURIComponent((request.url || '/').split('?')[0]);
    } catch {
      respond(request, response, 400, 'Malformed URL encoding.');
      return;
    }
    if (!pathname.startsWith('/') || pathname.includes('\0')) {
      respond(request, response, 400, 'Invalid request path.');
      return;
    }

    // Proxy MediaMTX WHEP/WebRTC so the browser can play RTSP-backed streams same-origin.
    if (pathname === '/webrtc' || pathname.startsWith('/webrtc/')) {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        response.end();
        return;
      }
      return proxyMediaMtx(request, response, pathname);
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD, POST, OPTIONS');
      respond(request, response, 405, 'Method not allowed.');
      return;
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.some(segment => segment.startsWith('.') || /[\\:]|[. ]$/.test(segment))) {
      respond(request, response, 403, 'This path is not allowed.');
      return;
    }
    const file = path.resolve(root, ...(segments.length ? segments : ['index.html']));
    if (!isInside(root, file)) {
      respond(request, response, 403, 'This path is not allowed.');
      return;
    }
    try {
      // Real paths prevent a symlink inside public from exposing files outside it.
      const [actualRoot, actualFile] = await Promise.all([realpath(root), realpath(file)]);
      if (!isInside(actualRoot, actualFile)) {
        respond(request, response, 403, 'This path is not allowed.');
        return;
      }
      const info = await stat(actualFile);
      if (!info.isFile()) {
        respond(request, response, 404, 'File not found.');
        return;
      }
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(actualFile).toLowerCase()] || 'application/octet-stream',
        'Content-Length': info.size,
      });
      if (request.method === 'HEAD') { response.end(); return; }
      const stream = createReadStream(actualFile);
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        const isAsset = ['vendor', 'models'].includes(segments[0]);
        respond(request, response, isAsset ? 503 : 404, isAsset
          ? 'Local model or library asset is missing. Run "npm install --ignore-scripts", then "npm run prepare:assets".'
          : 'File not found.');
      } else {
        respond(request, response, 500, 'Unable to read the requested file.');
      }
    }
  });
}

export async function startServer() {
  const portText = process.env.PORT || '5188';
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }
  await prepareAssets();
  const distIndex = path.join(PROJECT_DIR, 'dist', 'index.html');
  try {
    await access(distIndex);
  } catch {
    throw new Error('dist/ is missing. Run "npm run build" before "npm start", or use "npm run dev" for development.');
  }
  // Default 0.0.0.0 so Pi/LAN can open by IP; set HOST=127.0.0.1 to lock localhost-only.
  const host = process.env.HOST || '0.0.0.0';
  const server = createStaticServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const displayHost = host === '0.0.0.0' ? '0.0.0.0 (all interfaces)' : host;
  console.log(`Face Reg is running at http://${displayHost}:${port}`);
  console.log('Open this address in Chrome or Edge. Press Ctrl+C to stop.');
  if (host === '0.0.0.0') {
    console.log('Listening on all interfaces (suitable for Raspberry Pi LAN access).');
  }
  const stop = () => server.close(() => { process.exitCode = 0; });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return server;
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer().catch(error => {
    console.error(error.code === 'EADDRINUSE'
      ? `Port ${process.env.PORT || '5188'} is already in use. Stop the other server or set PORT to a different number.`
      : `Unable to start Face Reg: ${error.message}`);
    process.exitCode = 1;
  });
}
