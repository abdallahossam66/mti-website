// Mocked end-to-end submit: real browser → real proxy (node-server + lib/lead-proxy) → fake CRM.
import { expect, test } from '@playwright/test';
import { MOCK_CRM } from '../../playwright.config.js';

test('a complete enquiry reaches the CRM with the contract payload and the secret header', async ({ page, request }) => {
  await request.delete(`${MOCK_CRM}/__requests`);
  await page.goto('/?utm_source=linkedin&utm_medium=social&utm_campaign=launch-2026#contact');

  await page.fill('#f-name', '  Mona   Adel ');
  await page.fill('#f-email', 'mona@acme.example');
  await page.fill('#f-company', 'Acme Trading');
  await page.fill('#f-phone', '+20 105 577 8871');
  await page.selectOption('#f-country', 'EG');
  await page.selectOption('#f-industry', 'Retail & E-commerce');
  await page.check('input[value="AI Agents & Virtual Assistants"]');
  await page.check('input[value="Data Intelligence & Business Analytics"]');
  await page.selectOption('#f-timeline', '3–6 months');
  await page.fill('#f-message', 'We would like to automate customer support on WhatsApp.');
  await page.check('#f-consent');

  const responsePromise = page.waitForResponse('**/api/contact');
  await page.click('.btn-submit');
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  expect(await response.text()).not.toContain('test-secret');

  await expect(page.locator('#form-success')).toBeVisible();
  await expect(page.locator('#form-success')).toBeFocused();
  await expect(page.locator('#success-ref')).toHaveText(/^WL-TEST-\d{4}$/);

  const received = await (await request.get(`${MOCK_CRM}/__requests`)).json();
  expect(received).toHaveLength(1);
  const [{ headers, body }] = received;
  expect(headers['x-website-secret']).toBe('test-secret');
  expect(headers['content-type']).toBe('application/json');
  expect(body).toEqual({
    name: 'Mona Adel',
    business_email: 'mona@acme.example',
    company: 'Acme Trading',
    phone: '+20 105 577 8871',
    country: 'EG',
    industry: 'Retail & E-commerce',
    interested_services: ['AI Agents & Virtual Assistants', 'Data Intelligence & Business Analytics'],
    timeline: '3–6 months',
    message: 'We would like to automate customer support on WhatsApp.',
    consent: true,
    page_url: expect.stringContaining('/?utm_source=linkedin&utm_medium=social&utm_campaign=launch-2026'),
    utm: { source: 'linkedin', medium: 'social', campaign: 'launch-2026' },
  });
  expect(Object.keys(body)).not.toContain('budget');
});

test('Arabic page: translated labels, but the CRM receives the exact English enum strings', async ({ page, request }) => {
  await request.delete(`${MOCK_CRM}/__requests`);
  await page.goto('/ar/?utm_source=newsletter#contact');
  await page.fill('#f-name', 'منى عادل');
  await page.fill('#f-email', 'mona@acme.example');
  await page.fill('#f-company', 'شركة أكمي');
  await page.selectOption('#f-country', 'EG');
  await page.selectOption('#f-industry', { label: 'التجزئة والتجارة الإلكترونية' });
  await page.getByLabel('وكلاء الذكاء الاصطناعي والمساعدون الافتراضيون').check();
  await page.getByLabel('الأمن السيبراني وأمن المعلومات').check();
  await page.selectOption('#f-timeline', { label: 'من 3 إلى 6 أشهر' });
  await page.fill('#f-message', 'نرغب في أتمتة خدمة العملاء.');
  await page.check('#f-consent');
  await page.click('.btn-submit');

  await expect(page.locator('#form-success')).toBeVisible();
  await expect(page.locator('#form-success h4')).toHaveText('شكرًا لك. لقد تلقينا استفسارك.');
  await expect(page.locator('#success-ref')).toHaveText(/^WL-TEST-\d{4}$/);

  const [{ headers, body }] = await (await request.get(`${MOCK_CRM}/__requests`)).json();
  expect(headers['x-website-secret']).toBe('test-secret');
  expect(body).toEqual({
    name: 'منى عادل',
    business_email: 'mona@acme.example',
    company: 'شركة أكمي',
    country: 'EG',
    industry: 'Retail & E-commerce',
    interested_services: ['AI Agents & Virtual Assistants', 'Cybersecurity & Information Security'],
    timeline: '3–6 months',
    message: 'نرغب في أتمتة خدمة العملاء.',
    consent: true,
    page_url: expect.stringContaining('/ar/?utm_source=newsletter'),
    utm: { source: 'newsletter' },
  });
});

test('German page: the CRM receives the exact English enum strings', async ({ page, request }) => {
  await request.delete(`${MOCK_CRM}/__requests`);
  await page.goto('/de/#contact');
  await page.fill('#f-name', 'Jonas Weber');
  await page.fill('#f-email', 'jonas@example.de');
  await page.fill('#f-company', 'Weber GmbH');
  await page.selectOption('#f-industry', { label: 'Logistik & Transport' });
  await page.getByLabel('Datenintelligenz & Business Analytics').check();
  await page.selectOption('#f-timeline', { label: 'Noch nicht entschieden' });
  await page.check('#f-consent');
  await page.click('.btn-submit');
  await expect(page.locator('#success-ref')).toHaveText(/^WL-TEST-\d{4}$/);
  const [{ body }] = await (await request.get(`${MOCK_CRM}/__requests`)).json();
  expect(body).toMatchObject({ industry: 'Logistics & Transportation', interested_services: ['Data Intelligence & Business Analytics'], timeline: 'Not decided yet' });
});
