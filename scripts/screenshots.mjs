// Screenshots for review: full page and each section at 1440 and 390 px → docs/screenshots/{1440,390}/.
//   node scripts/screenshots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { server } from '../server/node-server.mjs';

const PORT = 8093;
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ channel: 'chrome' });

for (const width of [1440, 390]) {
  const dir = `docs/screenshots/${width}`;
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1, bypassCSP: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Freeze animations so captures are stable.
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.screenshot({ path: `${dir}/full-page.png`, fullPage: true });

  const sections = await page.locator('main > section, body > footer').evaluateAll((els) =>
    els.map((el) => { const r = el.getBoundingClientRect(); return { id: el.id || 'footer', y: r.top + window.scrollY, h: r.height }; }));
  const headerH = await page.locator('.site-header').evaluate((el) => el.offsetHeight);
  sections.forEach((s, i) => { s.index = i + 1; });
  for (const s of sections) {
    // Section captures include the sticky header only for the first section, so content is never covered.
    const y = s.index === 1 ? 0 : s.y;
    const h = s.index === 1 ? s.h + headerH : s.h;
    await page.screenshot({ path: `${dir}/${String(s.index).padStart(2, '0')}-${s.id}.png`, fullPage: true, clip: { x: 0, y, width, height: Math.ceil(h) } });
  }
  console.log(`${dir}: full-page + ${sections.length} sections`);
  await page.close();
}

// Form states (desktop and mobile): validation errors and success with reference (mocked response).
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, bypassCSP: true });
  await page.route('**/api/contact', (route) => route.fulfill({ status: 201, contentType: 'application/json', body: '{"status":"received","reference":"WL-2026-000123"}' }));
  await page.goto(`http://localhost:${PORT}/#contact`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important} .site-header{position:static}' });
  await page.click('.btn-submit');
  await page.locator('#contact-form').screenshot({ path: `docs/screenshots/${width}/form-errors.png` });
  await page.fill('#f-name', 'Mona Adel');
  await page.fill('#f-email', 'mona@example.com');
  await page.fill('#f-company', 'Acme Trading');
  await page.check('#f-consent');
  await page.click('.btn-submit');
  await page.waitForSelector('#form-success:not([hidden])');
  await page.locator('#contact-form').screenshot({ path: `docs/screenshots/${width}/form-success.png` });
  if (width === 390) {
    await page.goto(`http://localhost:${PORT}/`);
    await page.click('.nav-toggle');
    await page.screenshot({ path: 'docs/screenshots/390/mobile-menu-open.png' });
  }
  await page.close();
}

await browser.close();
server.close();
