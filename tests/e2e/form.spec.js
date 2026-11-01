// Contact form behaviour in the browser: validation, states, CTA wiring, rate limit, honeypot.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MOCK_CRM } from '../../playwright.config.js';

async function fillValid(page, name = 'Mona Adel') {
  await page.fill('#f-name', name);
  await page.fill('#f-email', 'mona@example.com');
  await page.fill('#f-company', 'Acme Trading');
  await page.check('#f-consent');
}
const crmCount = async (request) => (await (await request.get(`${MOCK_CRM}/__requests`)).json()).length;

test.beforeEach(async ({ page }) => { await page.goto('/#contact'); });

test('empty submit shows an error summary, inline errors and aria-invalid', async ({ page }) => {
  await page.click('.btn-submit');
  const summary = page.locator('#error-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(summary.locator('li')).toHaveCount(4);
  for (const id of ['#f-name', '#f-email', '#f-company']) {
    await expect(page.locator(id)).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await page.locator(id).getAttribute('aria-describedby');
    await expect(page.locator(`#${describedBy}`)).toBeVisible();
  }
  await expect(page.locator('#f-consent-error')).toContainText('Please confirm');
  // Errors carry an icon and text, not colour alone.
  await expect(page.locator('#f-name-error svg')).toHaveCount(1);
  await summary.locator('a').first().click();
  await expect(page.locator('#f-name')).toBeFocused();
});

test('email format is checked on blur and the error clears once fixed', async ({ page }) => {
  await page.fill('#f-email', 'mona@');
  await page.locator('#f-email').blur();
  await expect(page.locator('#f-email-error')).toContainText('valid email address');
  await page.fill('#f-email', 'mona@example.com');
  await expect(page.locator('#f-email-error')).toBeHidden();
  await expect(page.locator('#f-email')).not.toHaveAttribute('aria-invalid', 'true');
});

test('"Explore Solution" pre-ticks that service and moves to the form', async ({ page }) => {
  await page.goto('/');
  await page.locator('#solution-cybersecurity .card-link').click();
  await expect(page.locator('input[value="Cybersecurity & Information Security"]')).toBeChecked();
  await expect(page.locator('#contact-title')).toBeFocused();
  expect(page.url()).toContain('#contact');
});

test('CRM 422 errors are mapped to the matching field', async ({ page }) => {
  await fillValid(page, 'Mona [422]');
  await page.click('.btn-submit');
  await expect(page.locator('#f-email-error')).toContainText('This email domain is not accepted.');
  await expect(page.locator('#error-summary')).toBeVisible();
  await expect(page.locator('#form-success')).toBeHidden();
});

test('CRM 429 asks the visitor to try again later', async ({ page }) => {
  await fillValid(page, 'Mona [429]');
  await page.click('.btn-submit');
  await expect(page.locator('#form-alert')).toContainText('try again in a few minutes');
});

test('server errors show a clear message with direct contact options', async ({ page }) => {
  await fillValid(page, 'Mona [500]');
  await page.click('.btn-submit');
  const alert = page.locator('#form-alert');
  await expect(alert).toContainText("We couldn't send your message right now");
  await expect(alert.locator('a[href="mailto:info@mtiaisolutions.com"]')).toBeVisible();
  await expect(alert.locator('a[href="https://wa.me/201055778871"]')).toBeVisible();
  await expect(page.locator('#f-name')).toHaveValue('Mona [500]'); // input is kept
});

test('network failure is reported, never silent', async ({ page }) => {
  await page.route('**/api/contact', (route) => route.abort('failed'));
  await fillValid(page);
  await page.click('.btn-submit');
  await expect(page.locator('#form-alert')).toContainText("We couldn't send your message right now");
});

test('browser rate limit blocks an immediate second request', async ({ page }) => {
  await fillValid(page, 'Mona [500]');
  await page.click('.btn-submit');
  await expect(page.locator('#form-alert')).toBeVisible();
  const before = await crmCount(page.request);
  await page.click('.btn-submit');
  await expect(page.locator('#form-hint')).toContainText(/Please wait \d+ seconds? before sending again/);
  expect(await crmCount(page.request)).toBe(before);
});

test('honeypot: a filled spam trap shows success but sends nothing', async ({ page }) => {
  const before = await crmCount(page.request);
  await fillValid(page);
  await page.locator('#f-website').evaluate((el) => { el.value = 'http://spam.example'; });
  await page.click('.btn-submit');
  await expect(page.locator('#form-success')).toBeVisible();
  await expect(page.locator('.success-ref')).toBeHidden();
  expect(await crmCount(page.request)).toBe(before);
});

test('"Book a Consultation" opens the form with a note and no booking widget', async ({ page }) => {
  await page.click('#book-consultation');
  await expect(page.locator('#booking-note')).toBeVisible();
  await expect(page.locator('#booking-note')).toBeFocused();
  await expect(page.locator('#booking-note')).toContainText('Online booking will be available soon');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('FAQ accordion toggles with aria-expanded', async ({ page }) => {
  const btn = page.locator('#faq-q1');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#faq-a1')).toBeHidden();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#faq-a1')).toBeVisible();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
});

test('mobile menu opens, closes on Escape and returns focus', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-390', 'mobile only');
  const toggle = page.locator('.nav-toggle');
  await expect(page.locator('#site-nav')).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#site-nav')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.locator('#site-nav a[href="#faq"]').click();
  await expect(page.locator('#site-nav')).toBeHidden();
});

/* ---------- Translated pages: labels and messages follow the page, CRM values stay English ---------- */
for (const lang of ['de', 'ar']) {
  const t = JSON.parse(readFileSync(new URL(`../../src/i18n/${lang}.json`, import.meta.url), 'utf8'));

  test.describe(`${lang.toUpperCase()} form`, () => {
    test.beforeEach(async ({ page }) => { await page.goto(`/${lang}/#contact`); });

    test('validation messages and the error summary are translated', async ({ page }) => {
      await page.click('.btn-submit');
      await expect(page.locator('#error-summary')).toBeFocused();
      await expect(page.locator('#error-summary h4')).toContainText(t.form.summaryTitle);
      await expect(page.locator('#f-name-error')).toHaveText(t.messages.fields.name.required);
      await expect(page.locator('#f-consent-error')).toHaveText(t.messages.fields.consent.required);
      await page.fill('#f-email', 'mona@');
      await page.locator('#f-email').blur();
      await expect(page.locator('#f-email-error')).toHaveText(t.messages.fields.business_email.invalid);
    });

    test('country names are shown in the page language; values stay ISO codes', async ({ page }) => {
      const egypt = page.locator('#f-country option[value="EG"]');
      await expect(egypt).toHaveText(lang === 'de' ? 'Ägypten' : 'مصر');
      await expect(page.locator('#f-country option[value="DE"]')).toHaveText(lang === 'de' ? 'Deutschland' : 'ألمانيا');
    });

    test('CRM 422 errors are shown in the page language', async ({ page }) => {
      await page.fill('#f-name', 'Mona [422]');
      await page.fill('#f-email', 'mona@example.com');
      await page.fill('#f-company', 'Acme');
      await page.check('#f-consent');
      await page.click('.btn-submit');
      await expect(page.locator('#f-email-error')).toHaveText(t.messages.fields.business_email.invalid);
    });

    test('server error and rate-limit messages are translated', async ({ page }) => {
      await page.fill('#f-name', 'Mona [500]');
      await page.fill('#f-email', 'mona@example.com');
      await page.fill('#f-company', 'Acme');
      await page.check('#f-consent');
      await page.click('.btn-submit');
      const alert = page.locator('#form-alert');
      await expect(alert).toContainText(t.messages.generic.split('{email}')[0].trim());
      await expect(alert.locator('a[href="mailto:info@mtiaisolutions.com"]')).toBeVisible();
      await expect(alert.locator('a[href="https://wa.me/201055778871"]')).toBeVisible();
      await page.click('.btn-submit');
      await expect(page.locator('#form-hint')).toHaveText(lang === 'de' ? /^Bitte warten Sie \d+ Sekunden?, bevor Sie erneut senden\.$/ : /^يرجى الانتظار .+ قبل الإرسال مرة أخرى\.$/);
    });

    test('booking placeholder note is translated', async ({ page }) => {
      await page.click('#book-consultation');
      await expect(page.locator('#booking-note')).toHaveText(t.contact.bookingNote);
    });
  });
}
