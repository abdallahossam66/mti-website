// End-to-end tests run against the real Node server + proxy, with a fake CRM (tests/mock-crm.mjs).
// Uses the locally installed Google Chrome (channel: 'chrome'), so no browser download is needed.
import { defineConfig } from '@playwright/test';

const SITE_PORT = 8090;
const CRM_PORT = 4011;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${SITE_PORT}`, channel: 'chrome', trace: 'off' },
  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: [
    {
      command: 'node tests/mock-crm.mjs',
      env: { MOCK_CRM_PORT: String(CRM_PORT), WEBSITE_FORM_SECRET: 'test-secret' },
      url: `http://127.0.0.1:${CRM_PORT}/__requests`,
      reuseExistingServer: false,
    },
    {
      command: 'node server/node-server.mjs',
      env: { PORT: String(SITE_PORT), CRM_URL: `http://127.0.0.1:${CRM_PORT}`, WEBSITE_FORM_SECRET: 'test-secret', CONTACT_RATE_MAX: '1000' },
      url: `http://localhost:${SITE_PORT}/`,
      reuseExistingServer: false,
    },
  ],
});

export const MOCK_CRM = `http://127.0.0.1:${CRM_PORT}`;
