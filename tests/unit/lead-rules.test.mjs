import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { INDUSTRIES, SERVICES, TIMELINES, sanitizeLead, validateLead } from '../../public/assets/js/lead-rules.js';

const brief = JSON.parse(readFileSync(new URL('../fixtures/brief-copy.json', import.meta.url), 'utf8'));
const valid = () => ({ name: 'Mona Adel', business_email: 'mona@example.com', company: 'Acme', consent: true });

test('approved lists match the brief exactly', () => {
  assert.deepEqual(INDUSTRIES, brief.industries.cards.map(([name]) => name));
  assert.deepEqual(SERVICES, brief.solutions.categories.map((c) => c.name));
  assert.deepEqual(TIMELINES, brief.contact.timelines);
  assert.equal(TIMELINES[2], '3–6 months', 'en dash U+2013');
  assert.equal(TIMELINES[3], '6–12 months', 'en dash U+2013');
});

test('a minimal valid lead passes', () => {
  assert.deepEqual(validateLead(sanitizeLead(valid())), {});
});

test('required fields and consent are enforced', () => {
  const errors = validateLead(sanitizeLead({ name: '  ', business_email: '', consent: false }));
  assert.deepEqual(Object.keys(errors).sort(), ['business_email', 'company', 'consent', 'name']);
  assert.ok(validateLead(sanitizeLead({ ...valid(), consent: 'true' })).consent, 'consent must be boolean true');
});

test('email format and length limits', () => {
  for (const email of ['plain', 'a@b', 'a b@c.com', 'a@b.', '@b.com']) {
    assert.ok(validateLead(sanitizeLead({ ...valid(), business_email: email })).business_email, email);
  }
  assert.deepEqual(validateLead(sanitizeLead({ ...valid(), business_email: 'first.last+tag@sub.example.co' })), {});
  assert.ok(validateLead(sanitizeLead({ ...valid(), name: 'x'.repeat(121) })).name);
  assert.deepEqual(validateLead(sanitizeLead({ ...valid(), name: 'x'.repeat(120) })), {});
  assert.ok(validateLead(sanitizeLead({ ...valid(), company: 'x'.repeat(161) })).company);
  assert.ok(validateLead(sanitizeLead({ ...valid(), business_email: `${'a'.repeat(185)}@x.com` })).business_email);
  assert.ok(validateLead(sanitizeLead({ ...valid(), message: 'x'.repeat(4001) })).message);
  assert.deepEqual(validateLead(sanitizeLead({ ...valid(), message: 'x'.repeat(4000) })), {});
});

test('phone accepts common formats only', () => {
  for (const phone of ['+20 105 577 8871', '(02) 1234-5678', '0105.577.8871']) {
    assert.deepEqual(validateLead(sanitizeLead({ ...valid(), phone })), {}, phone);
  }
  for (const phone of ['call me', '123', 'x'.repeat(41)]) assert.ok(validateLead(sanitizeLead({ ...valid(), phone })).phone, phone);
});

test('enumerated fields accept only approved values', () => {
  assert.deepEqual(validateLead(sanitizeLead({ ...valid(), country: 'eg', industry: 'Healthcare', timeline: '3–6 months', interested_services: SERVICES.slice(0, 2) })), {});
  assert.ok(validateLead(sanitizeLead({ ...valid(), country: 'XX' })).country);
  assert.ok(validateLead(sanitizeLead({ ...valid(), country: 'Egypt' })).country);
  assert.ok(validateLead(sanitizeLead({ ...valid(), industry: 'Healthcare & Pharma' })).industry);
  assert.ok(validateLead(sanitizeLead({ ...valid(), timeline: '3-6 months' })).timeline, 'hyphen is not the approved en dash');
  assert.ok(validateLead(sanitizeLead({ ...valid(), interested_services: ['Blockchain'] })).interested_services);
  assert.ok(validateLead(sanitizeLead({ ...valid(), interested_services: 'Custom Software Development' })).interested_services);
});

test('sanitize drops unknown keys, empties and duplicates, and caps attribution fields', () => {
  const lead = sanitizeLead({
    ...valid(), budget: '50k', projected_budget: 1, company_website: 'bot', __proto__: { polluted: true },
    phone: '', country: 'eg', interested_services: [SERVICES[0], SERVICES[0], ''],
    page_url: 'x'.repeat(600), referrer: '  ', utm: { source: 's'.repeat(200), medium: '', extra: 'no' },
  });
  assert.deepEqual(Object.keys(lead).sort(), ['business_email', 'company', 'consent', 'country', 'interested_services', 'name', 'page_url', 'utm']);
  assert.equal(lead.country, 'EG');
  assert.deepEqual(lead.interested_services, [SERVICES[0]]);
  assert.equal(lead.page_url.length, 500);
  assert.deepEqual(Object.keys(lead.utm), ['source']);
  assert.equal(lead.utm.source.length, 120);
  assert.equal({}.polluted, undefined);
});
