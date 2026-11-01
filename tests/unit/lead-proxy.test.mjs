import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLogger, handleLead } from '../../lib/lead-proxy.mjs';

const SECRET = 's3cr3t-Value-Never-Logged';
const ENV = { CRM_URL: 'https://crm.example.com/', WEBSITE_FORM_SECRET: SECRET };
const LEAD = { name: 'Mona Adel', business_email: 'mona@example.com', company: 'Acme', consent: true, interested_services: ['Custom Software Development'], timeline: '3–6 months' };
const HEADERS = { origin: 'https://mtiaisolutions.com', host: 'mtiaisolutions.com', 'content-type': 'application/json' };

/** Runs handleLead with a mocked fetch and a capturing logger; returns everything observable. */
async function run({ body = LEAD, headers = HEADERS, method = 'POST', env = ENV, crm = { status: 201, body: { status: 'received', reference: 'WL-2026-0042' } }, fetchError } = {}) {
  const calls = [];
  const lines = [];
  const sink = { log: (m) => lines.push(m), warn: (m) => lines.push(m), error: (m) => lines.push(m) };
  const fetch = async (url, init) => {
    calls.push({ url, init });
    if (fetchError) throw fetchError;
    return new Response(JSON.stringify(crm.body), { status: crm.status, headers: { 'Content-Type': 'application/json', ...crm.headers } });
  };
  const res = await handleLead(
    { method, headers, body: typeof body === 'string' ? body : JSON.stringify(body) },
    { env, fetch, log: createLogger(env.WEBSITE_FORM_SECRET, sink), timeoutMs: 50 },
  );
  // The secret must never appear in a log line or a response, in any scenario.
  for (const line of lines) assert.ok(!line.includes(SECRET), `secret leaked in log: ${line}`);
  assert.ok(!res.body.includes(SECRET), 'secret leaked in response body');
  assert.ok(!JSON.stringify(res.headers).includes(SECRET), 'secret leaked in response headers');
  return { res, json: JSON.parse(res.body), calls, lines };
}

test('adds X-Website-Secret from the environment and forwards to {CRM_URL}/api/website/leads', async () => {
  const { res, json, calls } = await run();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://crm.example.com/api/website/leads', 'trailing slash on CRM_URL is handled');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['X-Website-Secret'], SECRET);
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), LEAD);
  assert.equal(res.status, 201);
  assert.deepEqual(json, { status: 'received', reference: 'WL-2026-0042' });
});

test('strips unknown fields (budget, honeypot key, nested utm extras) before forwarding', async () => {
  const { calls } = await run({ body: { ...LEAD, budget: '100k', projected_budget: 5, company_website: '', utm: { source: 'li', extra: 'x' }, role: 'admin' } });
  const sent = JSON.parse(calls[0].init.body);
  assert.deepEqual(Object.keys(sent).sort(), [...Object.keys(LEAD), 'utm'].sort());
  assert.deepEqual(sent.utm, { source: 'li' });
});

test('forwards CRM 422 with field errors (unknown keys dropped)', async () => {
  const { res, json } = await run({ crm: { status: 422, body: { message: 'The given data was invalid.', errors: { business_email: ['Domain not accepted.'], internal: ['x'] } } } });
  assert.equal(res.status, 422);
  assert.deepEqual(json, { message: 'The given data was invalid.', errors: { business_email: ['Domain not accepted.'] } });
});

test('forwards CRM 429 with Retry-After', async () => {
  const { res } = await run({ crm: { status: 429, body: { message: 'Too Many Attempts.' }, headers: { 'Retry-After': '60' } } });
  assert.equal(res.status, 429);
  assert.equal(res.headers['Retry-After'], '60');
});

test('maps CRM 404 (wrong secret) to a generic 502 and logs an error without the secret', async () => {
  const { res, json, lines } = await run({ crm: { status: 404, body: { message: 'Not Found' } } });
  assert.equal(res.status, 502);
  assert.doesNotMatch(json.message, /secret|404/i);
  assert.ok(lines.some((l) => l.includes('404') && l.includes('WEBSITE_FORM_SECRET')));
});

test('maps CRM 5xx, network errors and timeouts to 502', async () => {
  assert.equal((await run({ crm: { status: 500, body: {} } })).res.status, 502);
  assert.equal((await run({ crm: { status: 503, body: {} } })).res.status, 502);
  const net = await run({ fetchError: new TypeError('fetch failed') });
  assert.equal(net.res.status, 502);
  const timeout = await run({ fetchError: Object.assign(new Error('timed out'), { name: 'TimeoutError' }) });
  assert.equal(timeout.res.status, 502);
  assert.ok(timeout.lines.some((l) => l.includes('timeout')));
});

test('honeypot: returns 201 and never calls the CRM', async () => {
  const { res, json, calls } = await run({ body: { ...LEAD, company_website: 'http://spam.example' } });
  assert.equal(res.status, 201);
  assert.deepEqual(json, { status: 'received' });
  assert.equal(calls.length, 0);
});

test('server-side validation returns 422 in the CRM shape without calling the CRM', async () => {
  const { res, json, calls } = await run({ body: { name: 'A', business_email: 'not-an-email', consent: false } });
  assert.equal(res.status, 422);
  assert.deepEqual(Object.keys(json.errors).sort(), ['business_email', 'company', 'consent']);
  assert.equal(calls.length, 0);
});

test('rejects bad requests: method, content type, size, JSON, origin', async () => {
  assert.equal((await run({ method: 'GET' })).res.status, 405);
  assert.equal((await run({ headers: { ...HEADERS, 'content-type': 'text/plain' } })).res.status, 415);
  assert.equal((await run({ body: JSON.stringify({ ...LEAD, message: 'x'.repeat(17 * 1024) }) })).res.status, 413);
  assert.equal((await run({ body: '{not json' })).res.status, 400);
  assert.equal((await run({ body: '[1,2]' })).res.status, 400);
  assert.equal((await run({ headers: { ...HEADERS, origin: 'https://evil.example' } })).res.status, 403);
  assert.equal((await run({ headers: { host: 'mtiaisolutions.com', 'content-type': 'application/json' } })).res.status, 403, 'missing Origin');
  const allowed = await run({ headers: { ...HEADERS, origin: 'https://www.mtiaisolutions.com' }, env: { ...ENV, ALLOWED_ORIGINS: 'https://mtiaisolutions.com, https://www.mtiaisolutions.com/' } });
  assert.equal(allowed.res.status, 201);
});

test('accepts a Fetch API Headers object (Netlify runtime)', async () => {
  const { res } = await run({ headers: new Headers(HEADERS) });
  assert.equal(res.status, 201);
});

test('missing configuration returns 500 and logs only variable names', async () => {
  const { res, lines, calls } = await run({ env: { CRM_URL: 'https://crm.example.com' } });
  assert.equal(res.status, 500);
  assert.equal(calls.length, 0);
  assert.ok(lines.some((l) => l.includes('WEBSITE_FORM_SECRET')));
});

test('logger redacts the secret even if a message contains it', () => {
  const lines = [];
  const log = createLogger(SECRET, { log: (m) => lines.push(m), warn: (m) => lines.push(m), error: (m) => lines.push(m) });
  log.error(`header was ${SECRET}`);
  assert.equal(lines[0], '[contact] header was [redacted]');
});

test('never logs lead personal data', async () => {
  const { lines } = await run();
  for (const value of [LEAD.name, LEAD.business_email, LEAD.company]) {
    assert.ok(!lines.some((l) => l.includes(value)), `PII "${value}" logged`);
  }
});
