// Generates the static pages from src/template.mjs + src/i18n/{en,de,ar}.json:
//   public/index.html (en), public/de/index.html, public/ar/index.html,
//   public/privacy.html, terms.html, cookies.html, 404.html (English), public/sitemap.xml.
//   npm run build            write the files
//   npm run build -- --check exit 1 if any committed file differs from what the sources produce
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { EMAIL, LANGS, SITE, esc, renderHome, renderPlain } from '../src/template.mjs';

const check = process.argv.includes('--check');
const strings = Object.fromEntries(LANGS.map((l) => [l.code, JSON.parse(readFileSync(`src/i18n/${l.code}.json`, 'utf8'))]));
const outputs = {};

for (const l of LANGS) outputs[`public${l.path}index.html`] = renderHome(strings[l.code]);

const LEGAL = [
  ['privacy.html', 'Privacy Policy', 'Privacy Policy of MTI AI SOLUTIONS.'],
  ['terms.html', 'Terms & Conditions', 'Terms & Conditions of MTI AI SOLUTIONS.'],
  ['cookies.html', 'Cookie Policy', 'Cookie Policy of MTI AI SOLUTIONS.'],
];
for (const [file, title, description] of LEGAL) {
  outputs[`public/${file}`] = renderPlain(strings.en, {
    title, description,
    body: `<p class="eyebrow">Legal</p>
<h1>${esc(title)}</h1>
<p class="placeholder-note">
  <svg class="icon" aria-hidden="true" focusable="false"><use href="/assets/img/icons.svg#info"/></svg>
  <span>This page is to be completed by MTI AI SOLUTIONS.</span>
</p>
<p>For any questions in the meantime, please contact us at <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
<a class="btn btn-primary" href="/">Back to Home</a>`,
  });
}
outputs['public/404.html'] = renderPlain(strings.en, {
  title: 'Page not found', description: 'The page you requested could not be found.',
  body: `<p class="eyebrow">Error 404</p>
<h1>Page not found</h1>
<p>The page you are looking for does not exist or has moved.</p>
<a class="btn btn-primary" href="/">Back to Home</a>`,
});

const alternates = [...LANGS.map((l) => [l.code, `${SITE}${l.path}`]), ['x-default', `${SITE}/`]]
  .map(([code, href]) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${href}"/>`).join('\n');
outputs['public/sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map((l) => `  <url>
    <loc>${SITE}${l.path}</loc>
    <lastmod>2026-11-01</lastmod>
${alternates}
  </url>`).join('\n')}
</urlset>
`;

let stale = 0;
for (const [file, content] of Object.entries(outputs)) {
  if (check) {
    const same = existsSync(file) && readFileSync(file, 'utf8') === content;
    if (!same) { stale += 1; console.log(`OUT OF DATE: ${file}`); }
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    console.log(file);
  }
}
if (check) {
  console.log(stale ? `${stale} generated file(s) are out of date: run npm run build` : `All ${Object.keys(outputs).length} generated files are up to date`);
  process.exit(stale ? 1 : 0);
}
