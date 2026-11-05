// Local-only bridge: serves the overlay page and relays input commands from your code to it.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { parseCommands } from './remote-input.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MAX_BODY = 64 * 1024;
const SERVED = ['/controller/', '/overlay/'];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.svg': 'image/svg+xml',
};

// Non-browser senders have no Origin. Refuse web pages elsewhere from driving the overlay.
export function allowedOrigin(origin) {
  if (origin === undefined) return true;
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname); }
  catch { return false; }
}

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new TypeError('body too large');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new TypeError('body must be valid JSON'); }
}

async function serveStatic(pathname, res) {
  let path;
  try { path = decodeURIComponent(pathname); }
  catch { return json(res, 400, { error: 'bad path' }); }
  if (path === '/') path = '/overlay/index.html';
  const file = resolve(ROOT, '.' + path);
  const inside = SERVED.some(prefix => file.startsWith(resolve(ROOT, '.' + prefix) + sep));
  if (!inside) return json(res, 404, { error: 'not found' });
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { json(res, 404, { error: 'not found' }); }
}

export function startBridge({ port = 8765 } = {}) {
  const overlays = new Set();
  const relay = commands => {
    const data = JSON.stringify(commands);
    for (const socket of overlays) if (socket.readyState === WebSocket.OPEN) socket.send(data);
  };

  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (!allowedOrigin(req.headers.origin)) return json(res, 403, { error: 'origin not allowed' });
    if (pathname === '/health') return json(res, 200, { ok: true, overlays: overlays.size });
    if (pathname === '/input') {
      if (req.method !== 'POST') return json(res, 405, { error: 'use POST' });
      try {
        relay(parseCommands(await readJson(req)));
        return json(res, 200, { ok: true, overlays: overlays.size });
      } catch (error) {
        return json(res, 400, { error: error.message });
      }
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'use GET' });
    return serveStatic(pathname, res);
  });

  const sockets = new WebSocketServer({ noServer: true, maxPayload: MAX_BODY });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/ws' || !allowedOrigin(req.headers.origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    sockets.handleUpgrade(req, socket, head, client => {
      client.on('error', () => {});
      if (url.searchParams.get('role') === 'overlay') {
        overlays.add(client);
        client.on('close', () => overlays.delete(client));
        return;
      }
      let sent = false;
      client.on('message', raw => {
        try {
          let payload;
          try { payload = JSON.parse(raw.toString('utf8')); }
          catch { throw new TypeError('message must be valid JSON'); }
          relay(parseCommands(payload));
          sent = true;
        } catch (error) { client.send(JSON.stringify({ error: error.message })); }
      });
      // A sender that crashes mid-press should not leave buttons lit.
      client.on('close', () => { if (sent) relay([{ type: 'release' }]); });
    });
  });

  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', fail);
      done({
        port: server.address().port,
        close: () => new Promise(closed => {
          for (const client of sockets.clients) client.terminate();
          sockets.close();
          server.closeAllConnections();
          server.close(closed);
        }),
      });
    });
  });
}
