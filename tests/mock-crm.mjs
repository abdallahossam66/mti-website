// Fake MTI CRM for end-to-end tests. Implements POST /api/website/leads per the CRM contract:
//   wrong/missing X-Website-Secret → 404, extra field → 422, name containing "[422]" / "[429]" / "[500]" → that status,
//   otherwise 201 {"status":"received","reference":"WL-TEST-0001"}.
// GET /__requests returns everything received; DELETE /__requests clears it.
import { createServer } from 'node:http';

const ALLOWED = new Set(['name', 'business_email', 'company', 'phone', 'country', 'industry', 'interested_services', 'timeline', 'message', 'consent', 'page_url', 'referrer', 'utm']);

export function startMockCrm({ port = 4010, secret = 'test-secret' } = {}) {
  const received = [];
  let counter = 0;
  const server = createServer((req, res) => {
    const reply = (status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
    if (req.url === '/__requests') {
      if (req.method === 'DELETE') { received.length = 0; return reply(200, { cleared: true }); }
      return reply(200, received);
    }
    if (req.method !== 'POST' || req.url !== '/api/website/leads') return reply(404, { message: 'Not found' });
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const body = JSON.parse(raw || '{}');
      received.push({ headers: req.headers, body });
      if (req.headers['x-website-secret'] !== secret) return reply(404, { message: 'Not found' });
      const extra = Object.keys(body).filter((k) => !ALLOWED.has(k));
      if (extra.length) return reply(422, { message: 'Unknown fields.', errors: Object.fromEntries(extra.map((k) => [k, ['This field is not allowed.']])) });
      const name = String(body.name || '');
      if (name.includes('[422]')) return reply(422, { message: 'The given data was invalid.', errors: { business_email: ['This email domain is not accepted.'], internal_note: ['ignored'] } });
      if (name.includes('[429]')) return reply(429, { message: 'Too Many Attempts.' }, { 'Retry-After': '60' });
      if (name.includes('[500]')) return reply(500, { message: 'Server Error' });
      counter += 1;
      return reply(201, { status: 'received', reference: `WL-TEST-${String(counter).padStart(4, '0')}` });
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, received, close: () => new Promise((r) => server.close(r)) })));
}

if (process.argv[1] && process.argv[1].endsWith('mock-crm.mjs')) {
  const port = Number(process.env.MOCK_CRM_PORT) || 4010;
  await startMockCrm({ port, secret: process.env.WEBSITE_FORM_SECRET || 'test-secret' });
  console.log(`mock CRM on http://127.0.0.1:${port}`);
}
