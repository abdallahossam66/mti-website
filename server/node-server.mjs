// Zero-dependency server for local development and VPS hosting.
// Serves public/ with the same security headers as netlify.toml and mounts POST /api/contact.
//   npm start   (reads .env if present; PORT defaults to 8080)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleLead, MAX_BODY_BYTES } from '../lib/lead-proxy.mjs';

const ROOT = resolve(fileURLToPath(new URL('../public', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'sha256-Du+OJKJSbdUgz5nrHeWWINvez6XKDDU/tyj/5c2uvwo='; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-Frame-Options': 'DENY',
};

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let file = join(ROOT, path);
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    if (!extname(file)) file += '.html';
  }
  try {
    const body = await readFile(file);
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const cache = file.includes(`${join(ROOT, 'assets')}`) ? 'public, max-age=86400' : 'no-cache';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, ...SECURITY_HEADERS });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    const body = await readFile(join(ROOT, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'Content-Type': TYPES['.html'], ...SECURITY_HEADERS });
    res.end(body);
  }
}

function send(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

// In-memory per-IP limit for /api/contact (single process). Set TRUST_PROXY=1 behind nginx/Caddy.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map();

function clientIp(req) {
  const forwarded = process.env.TRUST_PROXY === '1' ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) for (const [key, times] of hits) if (now - times.at(-1) > RATE_WINDOW_MS) hits.delete(key);
  return recent.length > (Number(process.env.CONTACT_RATE_MAX) || 5);
}

function readBody(req, limit) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function serveContact(req, res) {
  const reply = ({ status, headers, body }) => { res.writeHead(status, headers); res.end(body); };
  if (req.method === 'POST' && rateLimited(clientIp(req))) {
    return reply({ status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '600' }, body: JSON.stringify({ message: 'Too many requests. Please try again later.' }) });
  }
  let body = '';
  if (req.method === 'POST') {
    try { body = await readBody(req, MAX_BODY_BYTES + 1); } catch (err) {
      return reply({ status: err.code === 413 ? 413 : 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Invalid request.' }) });
    }
  }
  return reply(await handleLead({ method: req.method, headers: req.headers, body }));
}

export const server = createServer((req, res) => {
  if (new URL(req.url, 'http://localhost').pathname === '/api/contact') {
    return serveContact(req, res).catch(() => send(res, 500, 'Internal Server Error'));
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
  return serveStatic(req, res);
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.loadEnvFile(); } catch { /* no .env file: use the real environment */ }
  const port = Number(process.env.PORT) || 8080;
  server.listen(port, () => console.log(`MTI website on http://localhost:${port}`));
}
