// Content conformance per language: approved copy (EN, word for word against the brief fixture), translated
// copy (DE/AR, every string from the JSON file), section order, exclusions, brand rules, contact details
// (both offices), English CRM enums behind translated labels, hreflang, RTL and fonts.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { INDUSTRIES, SERVICES, TIMELINES } from '../../public/assets/js/lead-rules.js';

const c = JSON.parse(readFileSync(new URL('../fixtures/brief-copy.json', import.meta.url), 'utf8'));
const strings = Object.fromEntries(['en', 'de', 'ar'].map((l) => [l, JSON.parse(readFileSync(new URL(`../../src/i18n/${l}.json`, import.meta.url), 'utf8'))]));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const SITE = 'https://mtiaisolutions.com';
const LANGS = [
  { code: 'en', path: '/', dir: 'ltr' },
  { code: 'de', path: '/de/', dir: 'ltr' },
  { code: 'ar', path: '/ar/', dir: 'rtl' },
];
const ADDRESSES = ['Business Square, Delta Flowers Tower, 4 Hafez Ramadan, beside City Centre, Cairo, Egypt.', c.ownerAdditions.germanyOffice.address];
const TOOLS = ['TensorFlow', 'PyTorch', 'OpenAI', 'LangChain', 'AWS', 'Azure', 'Google Cloud', 'Kubernetes', 'Docker', 'Python', 'Laravel'];
const FORBIDDEN = {
  en: c.forbidden,
  de: ['MTI PLUS', 'GU CART', 'Budget', 'budget', 'Fallstudie', 'Garantie', 'garantiert', 'zertifiziert', 'Testimonial', 'Kundenstimmen', ...TOOLS],
  ar: ['MTI PLUS', 'GU CART', 'ميزانية', 'دراسة حالة', 'دراسات حالة', 'دراسات الحالة', 'ضمان', 'آراء العملاء', ...TOOLS],
};

/** Every visible or accessible string the template renders from a language file (tokens filled as on the page). */
function renderedStrings(t) {
  const out = [];
  const skip = new Set(['_meta', 'messages']);
  const tokens = { req: '*', count: '0', privacy: t.form.privacyLink, ref: '' };
  const visit = (v, path) => {
    if (typeof v === 'string') {
      if (path === 'form.noscript') return;
      out.push(norm(v.replace(/\{(\w+)\}/g, (m, k) => tokens[k] ?? m)));
    } else if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${path}[${i}]`));
    else for (const [k, x] of Object.entries(v)) if (!skip.has(k)) visit(x, path ? `${path}.${k}` : k);
  };
  visit(t, '');
  return out;
}

/** Body text plus accessible names and metadata held in attributes. */
const pageText = (page) => page.evaluate(() => [
  document.title,
  document.body.textContent,
  ...[...document.querySelectorAll('[aria-label], img[alt], meta[content]')].map((el) => el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('content')),
].join(' ').replace(/\s+/g, ' '));

for (const lang of LANGS) {
  const t = strings[lang.code];

  test.describe(`${lang.code.toUpperCase()} page`, () => {
    test.beforeEach(async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop-1440', 'content checks are viewport-independent');
      await page.goto(lang.path);
    });

    test('language, direction, canonical and hreflang alternates', async ({ page }) => {
      await expect(page.locator('html')).toHaveAttribute('lang', lang.code);
      await expect(page.locator('html')).toHaveAttribute('dir', lang.dir);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}${lang.path}`);
      const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => [e.hreflang, e.href]));
      expect(alternates).toEqual([['en', `${SITE}/`], ['de', `${SITE}/de/`], ['ar', `${SITE}/ar/`], ['x-default', `${SITE}/`]]);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `${SITE}${lang.path}`);
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', t._meta.locale);
      expect((await page.request.get(await page.locator('meta[property="og:image"]').getAttribute('content').then((u) => new URL(u).pathname))).status()).toBe(200);
    });

    test('language switcher: EN / DE / AR links, current page marked', async ({ page }) => {
      const links = page.locator('.lang-switch a');
      await expect(links).toHaveCount(3);
      expect(await links.evaluateAll((els) => els.map((a) => [a.getAttribute('href'), a.getAttribute('hreflang')]))).toEqual([['/', 'en'], ['/de/', 'de'], ['/ar/', 'ar']]);
      await expect(page.locator('.lang-switch a[aria-current="page"]')).toHaveAttribute('hreflang', lang.code);
      // Accessible names contain the visible label (WCAG 2.5.3).
      for (const label of ['EN', 'DE', 'AR']) await expect(page.locator('.lang-switch').getByRole('link', { name: new RegExp(`^${label}`) })).toHaveCount(1);
    });

    test('all nine sections in the agreed order, with the brief card counts', async ({ page }) => {
      expect(await page.locator('main > section').evaluateAll((els) => els.map((e) => e.id))).toEqual(c.sectionOrder);
      await expect(page.locator('.challenge-card')).toHaveCount(6);
      await expect(page.locator('.solution-card')).toHaveCount(8);
      await expect(page.locator('.industry-card')).toHaveCount(12);
      await expect(page.locator('.advantage-card')).toHaveCount(6);
      await expect(page.locator('.philosophy-steps > li')).toHaveCount(4);
      await expect(page.locator('.timeline > li')).toHaveCount(6);
      await expect(page.locator('.tech-card')).toHaveCount(8);
      await expect(page.locator('.acc-item')).toHaveCount(7);
      for (const card of await page.locator('.solution-card').all()) expect(await card.locator('.highlights li').count()).toBeLessThanOrEqual(3);
      // Numbers stay Western digits in every language.
      expect(await page.locator('.stage-num').allTextContents()).toEqual(['01', '02', '03', '04', '05', '06'].map((n) => expect.stringContaining(n)));
    });

    test(`every string from ${lang.code}.json appears on the page`, async ({ page }) => {
      const text = await pageText(page);
      expect(renderedStrings(t).filter((s) => !text.includes(s))).toEqual([]);
    });

    test('brand rules: company name always MTI AI SOLUTIONS, tagline in English', async ({ page }) => {
      const text = await pageText(page);
      const variants = text.match(/mti\s+(plus\s+)?ai\s+solutions?/gi) || [];
      expect(variants.filter((v) => v !== 'MTI AI SOLUTIONS')).toEqual([]);
      await expect(page.locator('.sig-tagline')).toHaveText('WHERE INDUSTRY MEETS INTELLIGENCE');
      await expect(page.locator('.footer-tagline')).toHaveText('WHERE INDUSTRY MEETS INTELLIGENCE');
      await expect(page.locator('.sig-name')).toHaveText('MTI AI SOLUTIONS');
    });

    test('excluded content is absent', async ({ page }) => {
      const html = readFileSync(`public${lang.path}index.html`, 'utf8');
      const text = await page.locator('body').textContent();
      for (const term of FORBIDDEN[lang.code]) {
        expect(text.includes(term), `"${term}" in page text`).toBe(false);
        expect(html.includes(term), `"${term}" in HTML`).toBe(false);
      }
      await expect(page.locator('[name*="budget" i], [id*="budget" i]')).toHaveCount(0);
      await expect(page.locator('#technology img')).toHaveCount(0);
    });

    test('contact details: both offices verbatim, official links', async ({ page }) => {
      expect(await page.locator('.contact-offices address').allTextContents()).toEqual(ADDRESSES);
      expect(await page.locator('.footer-offices address').allTextContents()).toEqual(ADDRESSES);
      expect(await page.locator('.contact-offices .detail-label').allTextContents()).toEqual([t.contact.egyptOffice, t.contact.germanyOffice]);
      await expect(page.locator('a[href="tel:+201055778871"]')).toHaveText('+20 105 577 8871');
      await expect(page.locator('a[href="mailto:info@mtiaisolutions.com"]').first()).toBeVisible();
      expect(await page.locator('a[href="https://wa.me/201055778871"]').count()).toBeGreaterThanOrEqual(2);
      expect(await page.locator('a[href="https://www.linkedin.com/company/mti-solutions-g/"]').count()).toBeGreaterThanOrEqual(2);
      await expect(page.locator('a[href="https://mtiaisolutions.com/"]')).toHaveCount(1);
    });

    test('form: translated labels, exact English enum values for the CRM, no budget field', async ({ page }) => {
      const industries = page.locator('#f-industry option:not([value=""])');
      expect(await industries.evaluateAll((els) => els.map((o) => o.value))).toEqual(INDUSTRIES);
      expect(await industries.allTextContents()).toEqual(t.industries.cards.map(([name]) => name));
      const services = page.locator('input[name="interested_services"]');
      expect(await services.evaluateAll((els) => els.map((i) => i.value))).toEqual(SERVICES);
      expect(await page.locator('.check-grid .check span').allTextContents()).toEqual(t.solutions.categories.map((s) => s.name));
      const timelines = page.locator('#f-timeline option:not([value=""])');
      expect(await timelines.evaluateAll((els) => els.map((o) => o.value))).toEqual(TIMELINES);
      expect(await timelines.allTextContents()).toEqual(t.form.timelines);
      expect(await page.locator('#f-country option').count()).toBe(250);
      expect(await page.locator('[data-service]').evaluateAll((els) => els.map((a) => a.dataset.service))).toEqual(SERVICES);
      expect((await page.locator('#lead-form label, #lead-form legend').allTextContents()).join(' ')).not.toMatch(/budget/i);
    });

    test('fonts: Cairo is used only where Arabic is shown', async ({ page }) => {
      await page.evaluate(() => document.fonts.ready);
      const cairo = await page.evaluate(() => [...document.fonts].filter((f) => f.family.includes('Cairo')).map((f) => f.status));
      if (lang.code === 'ar') {
        expect(cairo).toContain('loaded');
        const family = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(family.startsWith('Cairo')).toBe(true);
      } else {
        expect(cairo).not.toContain('loaded');
      }
    });

    if (lang.code !== 'en') {
      test('no untranslated English copy is left on the page', async ({ page }) => {
        const text = await pageText(page);
        const en = renderedStrings(strings.en);
        const own = new Set(renderedStrings(t));
        // Long English strings that were translated (differ from this language) must not appear.
        const leftovers = en.filter((s) => s.length > 24 && !own.has(s) && text.includes(s));
        expect(leftovers).toEqual([]);
      });
    }
  });
}

test.describe('English page (brief Release 1.0)', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-1440', 'content checks are viewport-independent');
    await page.goto('/');
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
      c.technology.headline, c.technology.text, c.technology.closing, c.technology.cta, ...c.technology.cards.flatMap((x) => [x.name, ...x.items]),
      c.faq.headline, c.faq.text, ...c.faq.items.flat(),
      c.contact.headline, c.contact.text, ...c.contact.ctas, ...c.contact.fieldLabels, ...c.contact.timelines,
      c.contact.email, c.contact.address, c.contact.phone,
      c.ownerAdditions.germanyOffice.label, c.ownerAdditions.germanyOffice.address,
      ...c.footer.company, ...c.footer.connect, ...c.footer.legal, c.footer.brandLine, c.footer.copyright,
    ];
    expect(expected.filter((s) => !text.includes(norm(s)))).toEqual([]);
    expect(await page.locator('.solution-card h3').allTextContents()).toEqual(SERVICES);
    expect(await page.locator('.industry-card h3').allTextContents()).toEqual(INDUSTRIES);
  });

  test('SEO metadata, JSON-LD with both office locations, sitemap with alternates', async ({ page }) => {
    await expect(page).toHaveTitle('MTI AI SOLUTIONS — AI, Automation & Custom Software for Businesses');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{80,170}/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('h1')).toHaveCount(1);
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(ld).toMatchObject({ name: 'MTI AI SOLUTIONS', email: 'info@mtiaisolutions.com', telephone: '+20 105 577 8871' });
    expect(ld.location).toHaveLength(2);
    expect(ld.location[1]).toMatchObject({ '@type': 'Place', name: 'Germany office', address: { streetAddress: 'Friedrichstraße 95', postalCode: '10117', addressLocality: 'Berlin', addressCountry: 'DE' } });
    const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((els) => els.filter((e) => e.closest('[hidden]') === null).map((e) => Number(e.tagName[1])));
    levels.forEach((lvl, i) => { if (i) expect(lvl - levels[i - 1]).toBeLessThanOrEqual(1); });
    const sitemap = await (await page.request.get('/sitemap.xml')).text();
    for (const loc of [`${SITE}/`, `${SITE}/de/`, `${SITE}/ar/`]) expect(sitemap).toContain(`<loc>${loc}</loc>`);
    expect(sitemap.match(/hreflang="x-default"/g)).toHaveLength(3);
    for (const path of ['/robots.txt', '/site.webmanifest', '/assets/img/og-image.png']) expect((await page.request.get(path)).status(), path).toBe(200);
  });

  test('legal placeholder pages are marked "to be completed by MTI" and noindex', async ({ page }) => {
    for (const [path, title] of [['/privacy.html', 'Privacy Policy'], ['/terms.html', 'Terms & Conditions'], ['/cookies.html', 'Cookie Policy']]) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page.locator('.placeholder-note')).toContainText('to be completed by MTI AI SOLUTIONS');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
      await expect(page.locator('.lang-switch a')).toHaveCount(3);
    }
  });
});

test('no horizontal scrolling in any language', async ({ page }) => {
  for (const lang of LANGS) {
    await page.goto(lang.path);
    await page.evaluate(() => document.fonts.ready);
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll, `${lang.code}: page wider than the viewport`).toBeLessThanOrEqual(client);
  }
});
