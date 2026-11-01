// Smoke test for the PHP proxy (server/php/api/contact.php) against the fake CRM.
//   node tests/php-smoke.mjs        (requires php ≥ 8.1 with cURL on PATH)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { startMockCrm } from './mock-crm.mjs';

const CRM_PORT = 4012;
const PHP_PORT = 8091;
const SECRET = 'php-test-secret';
const BASE = `http://127.0.0.1:${PHP_PORT}`;
const LEAD = { name: 'Mona Adel', business_email: 'mona@example.com', company: 'Acme', consent: true, timeline: '3–6 months' };

const crm = await startMockCrm({ port: CRM_PORT, secret: SECRET });
let phpLog = '';
const startPhp = (secret) => {
  const proc = spawn('php', ['-S', `127.0.0.1:${PHP_PORT}`, '-t', 'server/php'], {
    env: { ...process.env, CRM_URL: `http://127.0.0.1:${CRM_PORT}/`, WEBSITE_FORM_SECRET: secret },
  });
  proc.stderr.on('data', (d) => { phpLog += d; });
  return proc;
};

const post = (body, headers = {}) => fetch(`${BASE}/api/contact.php`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: BASE, ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(`ok   ${name}`); } catch (err) { results.push(`FAIL ${name}: ${err.message}`); process.exitCode = 1; }
}

let php = startPhp(SECRET);
await sleep(800);
try {
  await check('201: forwards with secret header, strips budget, returns reference', async () => {
    crm.received.length = 0;
    const res = await post({ ...LEAD, budget: '100k', utm: { source: 'li', extra: 'x' } });
    assert.equal(res.status, 201);
    assert.match((await res.json()).reference, /^WL-TEST-\d{4}$/);
    assert.equal(crm.received[0].headers['x-website-secret'], SECRET);
    assert.deepEqual(crm.received[0].body, { ...LEAD, utm: { source: 'li' } });
  });
  await check('422 from CRM is passed through with known fields only', async () => {
    const res = await post({ ...LEAD, name: 'Mona [422]' });
    assert.equal(res.status, 422);
    assert.deepEqual((await res.json()).errors, { business_email: ['This email domain is not accepted.'] });
  });
  await check('429 from CRM is passed through with Retry-After', async () => {
    const res = await post({ ...LEAD, name: 'Mona [429]' });
    assert.equal(res.status, 429);
    assert.equal(res.headers.get('retry-after'), '60');
  });
  await check('5xx from CRM → 502', async () => {
    assert.equal((await post({ ...LEAD, name: 'Mona [500]' })).status, 502);
  });
  await check('honeypot → 201 without forwarding', async () => {
    const before = crm.received.length;
    const res = await post({ ...LEAD, company_website: 'spam' });
    assert.equal(res.status, 201);
    assert.equal(crm.received.length, before);
  });
  await check('missing required fields → 422 without forwarding', async () => {
    const before = crm.received.length;
    assert.equal((await post({ name: 'x' })).status, 422);
    assert.equal(crm.received.length, before);
  });
  await check('bad requests: 405 / 415 / 400 / 403 / 413', async () => {
    assert.equal((await fetch(`${BASE}/api/contact.php`)).status, 405);
    assert.equal((await post(LEAD, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await post('[1]')).status, 400);
    assert.equal((await post(LEAD, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await post({ ...LEAD, message: 'x'.repeat(17000) })).status, 413);
  });
} finally {
  php.kill();
}

// Wrong secret: the CRM answers 404 → the proxy returns a generic 502 and logs without the secret.
await sleep(300);
const WRONG = 'wrong-secret-value-123';
phpLog = '';
php = startPhp(WRONG);
await sleep(800);
try {
  await check('404 (wrong secret) → generic 502, secret never logged or returned', async () => {
    const res = await post(LEAD);
    const text = await res.text();
    assert.equal(res.status, 502);
    assert.ok(!text.includes(WRONG));
    await sleep(200);
    assert.match(phpLog, /CRM returned 404: check WEBSITE_FORM_SECRET and CRM_URL/);
    assert.ok(!phpLog.includes(WRONG), 'secret found in PHP log');
  });
} finally {
  php.kill();
  await crm.close();
}

console.log(results.join('\n'));
console.log(process.exitCode ? 'PHP smoke test FAILED' : `PHP smoke test passed (${results.length} checks)`);
