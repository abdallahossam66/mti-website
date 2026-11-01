import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { MESSAGES_EN, checkLead, sanitizeLead, validateLead } from '../../public/assets/js/lead-rules.js';

const load = (lang) => JSON.parse(readFileSync(new URL(`../../src/i18n/${lang}.json`, import.meta.url), 'utf8'));
const en = load('en');
const brief = JSON.parse(readFileSync(new URL('../fixtures/brief-copy.json', import.meta.url), 'utf8'));
const PLURALS = new Set(['waitSeconds', 'tryMinutes']);

/** Walks two string trees in parallel and calls fn(enValue, otherValue, path) for every leaf. */
function walk(a, b, fn, path = '') {
  if (typeof a === 'string') return fn(a, b, path);
  assert.equal(typeof b, 'object', `${path}: missing or wrong type`);
  if (Array.isArray(a)) {
    assert.ok(Array.isArray(b) && b.length === a.length, `${path}: array length ${b?.length} ≠ ${a.length}`);
    a.forEach((v, i) => walk(v, b[i], fn, `${path}[${i}]`));
    return undefined;
  }
  const key = path.split('.').pop();
  if (PLURALS.has(key)) {
    assert.ok(typeof b.other === 'string', `${path}: plural forms need "other"`);
    for (const form of Object.values(b)) fn(a.other, form, path);
    return undefined;
  }
  assert.deepEqual(Object.keys(b).sort(), Object.keys(a).sort(), `${path}: keys differ`);
  for (const k of Object.keys(a)) walk(a[k], b[k], fn, path ? `${path}.${k}` : k);
  return undefined;
}

const tokens = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

for (const lang of ['de', 'ar']) {
  const t = load(lang);
  test(`${lang}.json has the same structure as en.json, no empty strings, and keeps every {token}`, () => {
    walk(en, t, (a, b, path) => {
      assert.equal(typeof b, 'string', `${path}: not a string`);
      assert.ok(b.trim().length > 0, `${path}: empty`);
      if (path.startsWith('_meta')) return;
      // Plural forms may spell out the number ("one", "two"), so {n} is optional there.
      const expected = tokens(a).filter((tok) => !(tok === 'n' && /waitSeconds|tryMinutes/.test(path)));
      for (const tok of expected) assert.ok(b.includes(`{${tok}}`), `${path}: lost {${tok}}`);
    });
  });

  test(`${lang}.json keeps the company name in English wherever en.json uses it`, () => {
    walk(en, t, (a, b, path) => {
      if (a.includes('MTI AI SOLUTIONS')) assert.ok(b.includes('MTI AI SOLUTIONS'), `${path}: company name missing or changed`);
      assert.doesNotMatch(b, /MTI\s+PLUS|MTI AI SOLUTION(?!S)/i, `${path}: company-name variant`);
    });
  });

  test(`${lang}.json is marked as a machine draft pending MTI review`, () => {
    assert.match(t._meta.status, /machine draft — pending MTI review/i);
    assert.equal(t._meta.lang, lang);
    assert.equal(t._meta.dir, lang === 'ar' ? 'rtl' : 'ltr');
  });
}

test('no excluded or unverifiable terms in any language (budget, case studies, guarantees, certifications)', () => {
  const FORBIDDEN = {
    en: [/budget/i, /case stud/i, /guarantee/i, /certified/i, /testimonial/i, /GU CART/i],
    de: [/budget/i, /fallstudie/i, /garant/i, /zertifiziert/i, /testimonial/i, /kundenstimme/i, /GU CART/i],
    ar: [/ميزانية/, /دراسة حالة/, /دراسات حالة/, /دراسات الحالة/, /ضمان/, /نضمن/, /آراء العملاء/, /GU CART/i],
  };
  for (const [lang, patterns] of Object.entries(FORBIDDEN)) {
    const text = JSON.stringify(load(lang));
    for (const p of patterns) assert.doesNotMatch(text, p, `${lang}: ${p}`);
  }
});

test('en.json is the approved brief copy (matches the verified fixture)', () => {
  assert.equal(en.hero.headline, brief.hero.headline);
  assert.equal(en.hero.text, brief.hero.text);
  for (const key of ['challenges', 'industries', 'why', 'process', 'technology', 'faq']) {
    assert.equal(en[key].headline, brief[key].headline, `${key}.headline`);
    assert.equal(en[key].text, brief[key].text, `${key}.text`);
    if (brief[key].closing) assert.equal(en[key].closing, brief[key].closing, `${key}.closing`);
  }
  assert.deepEqual(en.challenges.cards, brief.challenges.cards);
  assert.deepEqual(en.industries.cards, brief.industries.cards);
  assert.deepEqual(en.why.cards, brief.why.cards);
  assert.deepEqual(en.why.philosophy, brief.why.philosophy.map(([, name, desc]) => [name, desc]));
  assert.deepEqual(en.process.stages, brief.process.stages.map(([, title, , desc]) => [title, desc]));
  assert.deepEqual(en.process.journey, brief.process.stages.map((s) => s[2]));
  assert.deepEqual(en.technology.cards, brief.technology.cards);
  assert.deepEqual(en.faq.items, brief.faq.items);
  assert.deepEqual(en.solutions.categories.map((c) => c.name), brief.solutions.categories.map((c) => c.name));
  en.solutions.categories.forEach((c, i) => {
    assert.deepEqual(c.highlights, brief.solutions.categories[i].capabilities.slice(0, 3));
    assert.equal(c.description, brief.solutionDescriptionsPendingApproval[i]);
  });
  assert.equal(en.contact.headline, brief.contact.headline);
  assert.equal(en.contact.text, brief.contact.text);
  assert.deepEqual(en.form.timelines, brief.contact.timelines);
  assert.equal(en.footer.brandLine, brief.footer.brandLine);
  assert.equal(en.footer.copyright, brief.footer.copyright);
  assert.equal(en.contact.germanyOffice, brief.ownerAdditions.germanyOffice.label);
});

test('en.json field messages are identical to the proxy messages (MESSAGES_EN)', () => {
  assert.deepEqual(en.messages.fields, MESSAGES_EN);
});

test('checkLead returns codes; validateLead localizes them with the page messages', () => {
  const lead = sanitizeLead({ name: '', business_email: 'x@', company: 'c'.repeat(161), consent: false });
  assert.deepEqual(checkLead(lead), { name: 'required', business_email: 'invalid', company: 'tooLong', consent: 'required' });
  const de = load('de');
  assert.deepEqual(validateLead(lead, de.messages.fields), {
    name: ['Bitte geben Sie Ihren vollständigen Namen ein.'],
    business_email: ['Bitte geben Sie eine gültige E-Mail-Adresse ein, zum Beispiel name@firma.de.'],
    company: ['Der Unternehmensname darf höchstens 160 Zeichen lang sein.'],
    consent: ['Bitte bestätigen Sie, dass wir Ihre Angaben zur Beantwortung Ihrer Anfrage verwenden dürfen.'],
  });
  assert.equal(validateLead(lead).company[0], 'Your company name must be 160 characters or fewer.');
});
