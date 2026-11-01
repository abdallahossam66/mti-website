import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import handler, { config } from '../../netlify/functions/contact.mjs';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; delete process.env.CRM_URL; delete process.env.WEBSITE_FORM_SECRET; });

test('Netlify Function is mounted at /api/contact and forwards through the proxy core', async () => {
  assert.equal(config.path, '/api/contact');
  process.env.CRM_URL = 'https://crm.example.com';
  process.env.WEBSITE_FORM_SECRET = 'netlify-secret';
  let forwarded;
  globalThis.fetch = async (url, init) => {
    forwarded = { url, init };
    return new Response('{"status":"received","reference":"WL-NET-1"}', { status: 201, headers: { 'Content-Type': 'application/json' } });
  };
  const req = new Request('https://mtiaisolutions.com/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://mtiaisolutions.com', Host: 'mtiaisolutions.com' },
    body: JSON.stringify({ name: 'Mona', business_email: 'mona@example.com', company: 'Acme', consent: true, budget: 'x' }),
  });
  const res = await handler(req);
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { status: 'received', reference: 'WL-NET-1' });
  assert.equal(forwarded.url, 'https://crm.example.com/api/website/leads');
  assert.equal(forwarded.init.headers['X-Website-Secret'], 'netlify-secret');
  assert.ok(!('budget' in JSON.parse(forwarded.init.body)));
});

test('Netlify Function rejects GET with 405', async () => {
  process.env.CRM_URL = 'https://crm.example.com';
  process.env.WEBSITE_FORM_SECRET = 'netlify-secret';
  const res = await handler(new Request('https://mtiaisolutions.com/api/contact'));
  assert.equal(res.status, 405);
});
