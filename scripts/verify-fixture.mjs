// Checks that every approved string in tests/fixtures/brief-copy.json occurs in the brief PDF text.
// Needs pdftotext (poppler) and the brief at brief/Landing_Page_Master_Brief.pdf (not committed: confidential).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PDF = 'brief/Landing_Page_Master_Brief.pdf';
if (!existsSync(PDF)) { console.log(`SKIP: ${PDF} not present`); process.exit(0); }
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const brief = norm(execFileSync('pdftotext', ['-enc', 'UTF-8', '-raw', PDF, '-'], { encoding: 'utf8' }));
const c = JSON.parse(readFileSync('tests/fixtures/brief-copy.json', 'utf8'));

const expected = [
  c.company, c.tagline, c.hero.headline, c.hero.text, ...c.hero.ctas,
  c.challenges.headline, c.challenges.text, c.challenges.closing, ...c.challenges.cards.map(([n, d]) => `${n} ${d}`),
  c.solutions.headline, c.solutions.text, c.solutions.closing, `CTA: ${c.solutions.cta}`,
  ...c.solutions.categories.map((s, i) => `0${i + 1}. ${s.name} ${s.capabilities.join(' | ')}`),
  c.industries.headline, c.industries.text, c.industries.closing, `CTA: ${c.industries.cta}`,
  ...c.industries.cards.map(([n, a, b]) => `${n} ${a}; ${b}`),
  c.why.headline, c.why.text, c.why.closing, `CTA: ${c.why.cta}`, c.why.philosophyTitle,
  ...c.why.cards.map(([n, d]) => `${n} ${d}`), ...c.why.philosophy.map(([n, t, d]) => `${n} ${t} — ${d}`),
  c.process.headline, c.process.text, c.process.closing, `CTA: ${c.process.cta}`,
  c.process.stages.map((s) => s[2]).join(' → '),
  ...c.process.stages.map(([n, t, , d]) => `${n}. ${t} ${d}`),
  c.technology.headline, c.technology.text, c.technology.closing, `CTA: ${c.technology.cta}`,
  ...c.technology.cards.map((t, i) => `0${i + 1}. ${t.name} ${t.items.join(' | ')}`),
  c.faq.headline, c.faq.text, ...c.faq.items.map(([q, a]) => `${q} ${a}`),
  c.contact.headline, c.contact.text, `Primary CTA: ${c.contact.ctas[0]} Secondary CTA: ${c.contact.ctas[1]}`,
  ...c.contact.fieldLabels, c.contact.email, c.contact.website, c.contact.linkedin, c.contact.address, c.contact.phone,
  `Company: ${c.footer.company.join(' · ')}`, `Connect: ${c.footer.connect.join(' · ')}`, `Legal: ${c.footer.legal.join(' · ')}`,
  c.footer.brandLine, c.footer.copyright,
];

const missing = expected.filter((s) => !brief.includes(norm(s)));
missing.forEach((s) => console.log(`NOT IN BRIEF: ${s}`));
console.log(`${expected.length - missing.length}/${expected.length} fixture strings found in the brief`);
process.exit(missing.length ? 1 : 0);
