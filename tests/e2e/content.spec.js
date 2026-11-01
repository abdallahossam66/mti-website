// Brief conformance: approved copy, section order, exclusions, contact details, SEO metadata.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { INDUSTRIES, SERVICES, TIMELINES } from '../../public/assets/js/lead-rules.js';

const c = JSON.parse(readFileSync(new URL('../fixtures/brief-copy.json', import.meta.url), 'utf8'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-1440', 'content checks are viewport-independent');
  await page.goto('/');
});

test('all nine sections are present in the agreed order', async ({ page }) => {
  const ids = await page.locator('main > section').evaluateAll((els) => els.map((e) => e.id));
  expect(ids).toEqual(c.sectionOrder);
});

test('approved copy appears word for word', async ({ page }) => {
  const text = norm(await page.locator('body').textContent());
  const expected = [
    c.company, c.tagline, c.hero.headline, c.hero.text, ...c.hero.ctas,
    c.challenges.headline, c.challenges.text, c.challenges.closing, ...c.challenges.cards.flat(),
    c.solutions.headline, c.solutions.text, c.solutions.closing, c.solutions.cta, ...c.solutions.categories.map((s) => s.name),
    ...c.solutionDescriptionsPendingApproval,
    c.industries.headline, c.industries.text, c.industries.closing, c.industries.cta, ...c.industries.cards.flat(),
    c.why.headline, c.why.text, c.why.closing, c.why.cta, c.why.philosophyLabel, c.why.philosophyTitle, ...c.why.cards.flat(), ...c.why.philosophy.flat(),
    c.process.headline, c.process.text, c.process.closing, c.process.cta, ...c.process.stages.flat(),
    c.technology.headline, c.technology.text, c.technology.closing, c.technology.cta, ...c.technology.cards.flatMap((t) => [t.name, ...t.items]),
    c.faq.headline, c.faq.text, ...c.faq.items.flat(),
    c.contact.headline, c.contact.text, ...c.contact.ctas, ...c.contact.fieldLabels, ...c.contact.timelines,
    c.contact.email, c.contact.address, c.contact.phone,
    ...c.footer.company, ...c.footer.connect, ...c.footer.legal, c.footer.brandLine, c.footer.copyright,
  ];
  const missing = expected.filter((s) => !text.includes(norm(s)));
  expect(missing).toEqual([]);
});

test('card counts match the brief', async ({ page }) => {
  await expect(page.locator('.challenge-card')).toHaveCount(6);
  await expect(page.locator('.solution-card')).toHaveCount(8);
  await expect(page.locator('.industry-card')).toHaveCount(12);
  await expect(page.locator('.advantage-card')).toHaveCount(6);
  await expect(page.locator('.philosophy-steps > li')).toHaveCount(4);
  await expect(page.locator('.timeline > li')).toHaveCount(6);
  await expect(page.locator('.tech-card')).toHaveCount(8);
  await expect(page.locator('.acc-item')).toHaveCount(7);
  for (const card of await page.locator('.solution-card').all()) {
    expect(await card.locator('.highlights li').count()).toBeLessThanOrEqual(3);
    await expect(card.locator('a.card-link')).toHaveText(/^Explore Solution/);
  }
  expect(await page.locator('.solution-card h3').allTextContents()).toEqual(SERVICES);
  expect(await page.locator('.industry-card h3').allTextContents()).toEqual(INDUSTRIES);
});

test('company name is always written MTI AI SOLUTIONS', async ({ page }) => {
  const text = await page.locator('body').textContent();
  const title = await page.title();
  const alts = (await page.locator('img[alt]').evaluateAll((els) => els.map((e) => e.alt))).join(' ');
  for (const source of [text, title, alts]) {
    const variants = source.match(/mti\s+(plus\s+)?ai\s+solutions?/gi) || [];
    expect(variants.filter((v) => v !== 'MTI AI SOLUTIONS')).toEqual([]);
  }
  expect(text).toContain('WHERE INDUSTRY MEETS INTELLIGENCE');
});

test('excluded content is absent (case studies, GU CART X, tech stack, budget, unverified claims)', async ({ page }) => {
  const html = readFileSync('public/index.html', 'utf8');
  const text = await page.locator('body').textContent();
  for (const term of c.forbidden) {
    expect(text.includes(term), `"${term}" in page text`).toBe(false);
    expect(html.includes(term), `"${term}" in index.html`).toBe(false);
  }
  await expect(page.locator('[name*="budget" i], [id*="budget" i]')).toHaveCount(0);
  await expect(page.locator('#technology img')).toHaveCount(0);
  // The only raster/SVG images are the official logos.
  const imgs = await page.locator('img').evaluateAll((els) => els.map((e) => new URL(e.src).pathname));
  expect(imgs.every((p) => p === '/assets/img/logo-reversed.svg')).toBe(true);
});

test('official contact details and links are correct', async ({ page }) => {
  await expect(page.locator('a[href="mailto:info@mtiaisolutions.com"]').first()).toBeVisible();
  await expect(page.locator('a[href="tel:+201055778871"]')).toHaveText('+20 105 577 8871');
  expect(await page.locator('a[href="https://wa.me/201055778871"]').count()).toBeGreaterThanOrEqual(2);
  expect(await page.locator('a[href="https://www.linkedin.com/company/mti-solutions-g/"]').count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator('a[href="https://mtiaisolutions.com/"]')).toHaveCount(1);
  await expect(page.locator('address')).toHaveText(c.contact.address);
  await expect(page.locator('a[href="/privacy.html"]').first()).toBeVisible();
});

test('form controls use the approved option lists and have no budget field', async ({ page }) => {
  const industryOptions = await page.locator('#f-industry option').allTextContents();
  expect(industryOptions.slice(1)).toEqual(INDUSTRIES);
  expect(await page.locator('input[name="interested_services"]').evaluateAll((els) => els.map((e) => e.value))).toEqual(SERVICES);
  expect((await page.locator('#f-timeline option').allTextContents()).slice(1)).toEqual(TIMELINES);
  expect(await page.locator('#f-country option').count()).toBe(250);
  const labels = (await page.locator('#lead-form label, #lead-form legend').allTextContents()).join(' ');
  expect(labels).not.toMatch(/budget/i);
});

test('SEO metadata is complete', async ({ page }) => {
  await expect(page).toHaveTitle('MTI AI SOLUTIONS — AI, Automation & Custom Software for Businesses');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{80,170}/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://mtiaisolutions.com/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://mtiaisolutions.com/assets/img/og-image.png');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('h1')).toHaveCount(1);
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(ld).toMatchObject({ name: 'MTI AI SOLUTIONS', email: 'info@mtiaisolutions.com', telephone: '+20 105 577 8871' });
  // Heading levels never skip (h2 → h4 etc.).
  const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((els) => els.filter((e) => e.closest('[hidden]') === null).map((e) => Number(e.tagName[1])));
  levels.forEach((lvl, i) => { if (i) expect(lvl - levels[i - 1]).toBeLessThanOrEqual(1); });
  for (const path of ['/robots.txt', '/sitemap.xml', '/site.webmanifest', '/assets/img/og-image.png']) {
    expect((await page.request.get(path)).status(), path).toBe(200);
  }
});

test('legal placeholder pages are marked "to be completed by MTI" and noindex', async ({ page }) => {
  for (const [path, title] of [['/privacy.html', 'Privacy Policy'], ['/terms.html', 'Terms & Conditions'], ['/cookies.html', 'Cookie Policy']]) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveText(title);
    await expect(page.locator('.placeholder-note')).toContainText('to be completed by MTI AI SOLUTIONS');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  }
});
