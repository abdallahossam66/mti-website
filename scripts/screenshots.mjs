// Screenshots for review: full page, each section and form states at 1440 and 390 px, per language.
//   English → docs/screenshots/{1440,390}/   German → docs/screenshots/de/{…}   Arabic → docs/screenshots/ar/{…}
//   node scripts/screenshots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { server } from '../server/node-server.mjs';

const PORT = 8093;
const LANGS = [
  { code: 'en', path: '/', dir: 'docs/screenshots' },
  { code: 'de', path: '/de/', dir: 'docs/screenshots/de' },
  { code: 'ar', path: '/ar/', dir: 'docs/screenshots/ar' },
];
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important}';

await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ channel: 'chrome' });

for (const lang of LANGS) {
  for (const width of [1440, 390]) {
    const dir = `${lang.dir}/${width}`;
    mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1, bypassCSP: true });
    await page.goto(`http://localhost:${PORT}${lang.path}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: FREEZE });
    await page.screenshot({ path: `${dir}/full-page.png`, fullPage: true });

    const sections = await page.locator('main > section, body > footer').evaluateAll((els) =>
      els.map((el) => { const r = el.getBoundingClientRect(); return { id: el.id || 'footer', y: r.top + window.scrollY, h: r.height }; }));
    const headerH = await page.locator('.site-header').evaluate((el) => el.offsetHeight);
    for (const [i, s] of sections.entries()) {
      // The first capture includes the sticky header; later ones start at the section so nothing is covered.
      const y = i === 0 ? 0 : s.y;
      const h = i === 0 ? s.h + headerH : s.h;
      await page.screenshot({ path: `${dir}/${String(i + 1).padStart(2, '0')}-${s.id}.png`, fullPage: true, clip: { x: 0, y, width, height: Math.ceil(h) } });
    }
    await page.close();

    // Form states: validation errors and success with a reference (mocked response).
    const form = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, bypassCSP: true });
    await form.route('**/api/contact', (route) => route.fulfill({ status: 201, contentType: 'application/json', body: '{"status":"received","reference":"WL-2026-000123"}' }));
    await form.goto(`http://localhost:${PORT}${lang.path}#contact`, { waitUntil: 'networkidle' });
    await form.addStyleTag({ content: `${FREEZE} .site-header{position:static}` });
    await form.click('.btn-submit');
    await form.locator('#contact-form').screenshot({ path: `${dir}/form-errors.png` });
    await form.fill('#f-name', 'Mona Adel');
    await form.fill('#f-email', 'mona@example.com');
    await form.fill('#f-company', 'Acme Trading');
    await form.check('#f-consent');
    await form.click('.btn-submit');
    await form.waitForSelector('#form-success:not([hidden])');
    await form.locator('#contact-form').screenshot({ path: `${dir}/form-success.png` });
    if (width === 390) {
      await form.goto(`http://localhost:${PORT}${lang.path}`);
      await form.click('.nav-toggle');
      await form.screenshot({ path: `${dir}/mobile-menu-open.png` });
    }
    await form.close();
    console.log(`${dir}: full page + ${sections.length} sections + form states`);
  }
}

await browser.close();
server.close();
