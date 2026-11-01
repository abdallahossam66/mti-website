// Accessibility: axe-core (WCAG 2.1 A/AA) in several page states, plus keyboard-only operation.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const axe = (page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
const summarize = (violations) => violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);

for (const path of ['/', '/de/', '/ar/']) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    expect(summarize((await axe(page)).violations)).toEqual([]);
  });

  test(`${path} has no axe violations with FAQ open and form errors shown`, async ({ page }) => {
    await page.goto(path);
    for (const btn of await page.locator('.acc-trigger').all()) await btn.click();
    await page.click('.btn-submit');
    await expect(page.locator('#error-summary')).toBeVisible();
    expect(summarize((await axe(page)).violations)).toEqual([]);
  });

  test(`${path} has no axe violations with the mobile menu open`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-390', 'mobile only');
    await page.goto(path);
    await page.click('.nav-toggle');
    await expect(page.locator('.lang-switch')).toBeVisible();
    expect(summarize((await axe(page)).violations)).toEqual([]);
  });
}

test('placeholder and 404 pages have no axe violations', async ({ page }) => {
  for (const path of ['/privacy.html', '/terms.html', '/cookies.html', '/404.html']) {
    await page.goto(path);
    expect(summarize((await axe(page)).violations), path).toEqual([]);
  }
});

test('keyboard: skip link, visible focus, and a full form submission without a mouse', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-1440', 'keyboard flow runs on desktop');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  expect((await skip.boundingBox()).y).toBeGreaterThanOrEqual(0); // visible when focused

  // Every focusable element in the header shows a visible focus indicator.
  for (let i = 0; i < 9; i += 1) {
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return `${s.outlineStyle} ${s.outlineWidth}`;
    });
    expect(outline).not.toMatch(/^none|0px$/);
  }

  // Accordion works with Enter and Space.
  await page.locator('#faq-q3').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#faq-q3')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(page.locator('#faq-q3')).toHaveAttribute('aria-expanded', 'false');

  // Fill and submit the form using only the keyboard.
  await page.locator('#f-name').focus();
  await page.keyboard.type('Keyboard User');
  await page.keyboard.press('Tab');
  await page.keyboard.type('keyboard@example.com');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Keyboard Co');
  await page.locator('#f-consent').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#f-consent')).toBeChecked();
  await page.keyboard.press('Tab'); // the Privacy Policy link inside the consent text
  await expect(page.locator('.field-consent a[href="/privacy.html"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.btn-submit')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#form-success')).toBeFocused();
});
