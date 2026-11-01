# MTI AI SOLUTIONS — public website

The public landing page for **MTI AI SOLUTIONS** (*WHERE INDUSTRY MEETS INTELLIGENCE*), built from the *Landing Page Master Brief* (Release 1.0). It is a static site with no framework and no build step. A small server-side proxy sends contact-form leads to the MTI CRM.

- Design and decisions: [docs/PLAN.md](docs/PLAN.md)
- Test results, Lighthouse scores and the brief's pre-launch checklist: [docs/QA-REPORT.md](docs/QA-REPORT.md)
- Screenshots: [docs/screenshots/](docs/screenshots/)

## Repository layout

| Path | What it is |
| --- | --- |
| `public/` | The deployable site: `index.html`, legal placeholder pages, `404.html`, `robots.txt`, `sitemap.xml`, and assets (CSS, JS modules, fonts, logo, icons) |
| `public/assets/js/lead-rules.js` | Form rules shared by the browser and the proxy: the approved industry, service and timeline strings, length limits, and validation |
| `public/assets/js/site-config.js` | `BOOKING_URL` and the analytics hook |
| `lib/lead-proxy.mjs` | Proxy core: validates the lead, removes unknown fields, adds `X-Website-Secret`, forwards to the CRM, and maps CRM responses |
| `netlify/functions/contact.mjs` | Netlify Function serving `POST /api/contact` (default deployment) |
| `server/node-server.mjs` | Zero-dependency Node server for local development or a VPS: serves `public/` and `/api/contact` |
| `server/php/` | PHP version of the proxy, plus an Apache `.htaccess` |
| `tests/` | Unit tests (`node:test`), Playwright browser tests, a mock CRM, a PHP smoke test, and the approved-copy fixture |
| `scripts/` | QA and asset scripts (HTML validation, link check, Lighthouse, screenshots, contrast, page and icon generators) |

The brief and brand-kit PDFs are confidential and are not committed (see `.gitignore`). Keep them in `brief/` and `brand/` locally; `npm run verify:fixture` uses the brief.

## Run locally

Requirements: Node.js 20.12 or later. The browser tests also need Google Chrome and the PHP smoke test needs PHP 8.1+ with cURL. HTML validation needs Java.

```bash
npm install
cp .env.example .env        # then set CRM_URL and WEBSITE_FORM_SECRET
npm start                   # http://localhost:8080 (site + /api/contact)
```

The page works without `.env`, but the form will show its error state because the proxy has no CRM to forward to. To try the full flow without the real CRM, run the mock CRM in a second terminal:

```bash
node tests/mock-crm.mjs     # fake CRM on http://127.0.0.1:4010, secret "test-secret"
# .env: CRM_URL=http://127.0.0.1:4010  WEBSITE_FORM_SECRET=test-secret
```

### Environment variables

| Variable | Required | Where | Purpose |
| --- | --- | --- | --- |
| `CRM_URL` | Yes | Proxy | Base URL of the CRM. Leads go to `{CRM_URL}/api/website/leads` |
| `WEBSITE_FORM_SECRET` | Yes | Proxy | Shared secret from the CRM team, sent as `X-Website-Secret`. It is never sent to the browser or written to logs |
| `ALLOWED_ORIGINS` | No | Proxy | Comma-separated origins allowed to post (e.g. `https://mtiaisolutions.com,https://www.mtiaisolutions.com`). When empty, the request's `Origin` must match its `Host` |
| `PORT` | No | Node server | Default `8080` |
| `TRUST_PROXY` | No | Node server | Set to `1` behind nginx or Caddy so the per-IP limit uses `X-Forwarded-For` |
| `CONTACT_RATE_MAX` | No | Node server | Requests per IP per 10 minutes to `/api/contact` (default `5`) |

## Tests and QA

```bash
npm test                # unit tests: lead rules + proxy (header, status mapping, field stripping, secret never logged)
npm run test:e2e        # Playwright: content, form behaviour, mocked end-to-end submit, axe, keyboard (1440 and 390 px)
npm run test:php        # PHP proxy smoke test against the mock CRM
npm run validate:html   # W3C Nu HTML checker
npm run check:links     # linkinator crawl + #fragment check
npm run contrast        # WCAG contrast of every colour pair in use
npm run lighthouse      # mobile + desktop → docs/lighthouse/
npm run screenshots     # → docs/screenshots/{1440,390}/
npm run qa              # all of the above → docs/qa/summary.md
```

Playwright uses the installed Google Chrome (`channel: 'chrome'`), so `npx playwright install` is not needed.

## Deploy on Netlify (default)

1. In Netlify, create a site from the GitHub repository. `netlify.toml` already sets everything: publish directory `public`, functions directory `netlify/functions`, Node 20, security headers, and caching.
2. Under **Site configuration → Environment variables**, add `CRM_URL` and `WEBSITE_FORM_SECRET` with the **Functions** scope. Optionally add `ALLOWED_ORIGINS`.
3. Deploy. The function answers `POST /api/contact` (`export const config = { path: '/api/contact' }`), so no redirect rule is needed.
4. Add the custom domain `mtiaisolutions.com`. HTTPS is automatic.
5. Smoke test: submit the form once. A success message with a `WL-…` reference means the lead reached the CRM. **Functions → contact** shows logs such as `[contact] lead forwarded ref=WL-…`. A line saying `CRM returned 404: check WEBSITE_FORM_SECRET and CRM_URL` means the secret or URL is wrong.

To test locally with the Netlify runtime: `npx netlify-cli dev`.

## Alternative: VPS

### Option A: Node (recommended for a VPS)

```bash
git clone <repo> /srv/mti-website && cd /srv/mti-website
npm ci --omit=dev            # runtime has no dependencies; this just validates the lockfile
cp .env.example .env         # set CRM_URL, WEBSITE_FORM_SECRET, TRUST_PROXY=1
npm start                    # listens on PORT (default 8080)
```

systemd unit (`/etc/systemd/system/mti-website.service`):

```ini
[Unit]
Description=MTI AI SOLUTIONS website
After=network.target

[Service]
WorkingDirectory=/srv/mti-website
ExecStart=/usr/bin/node server/node-server.mjs
EnvironmentFile=/srv/mti-website/.env
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

nginx in front, for TLS and compression:

```nginx
server {
  server_name mtiaisolutions.com;
  listen 443 ssl http2;            # certificates via certbot
  gzip on; gzip_types text/css application/javascript image/svg+xml application/json;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Keep `proxy_set_header Host $host`: the proxy compares the browser's `Origin` with the `Host` header (or set `ALLOWED_ORIGINS`). With Caddy, `reverse_proxy 127.0.0.1:8080` is enough because Caddy handles TLS and compression.

### Option B: PHP (shared hosting or Apache + PHP)

1. Upload the contents of `public/` to the document root.
2. Copy `server/php/api/contact.php` to `<docroot>/api/contact.php` and `server/php/.htaccess` to `<docroot>/.htaccess`. The rewrite maps `POST /api/contact` to the PHP script.
3. Set the variables in the virtual host, not in a file inside the document root:
   `SetEnv CRM_URL https://crm.example.com` and `SetEnv WEBSITE_FORM_SECRET …` (Apache), or `fastcgi_param CRM_URL …;` (nginx + PHP-FPM).
4. nginx + PHP-FPM equivalent of the rewrite: `location = /api/contact { rewrite ^ /api/contact.php last; }`.

The PHP proxy filters the same fields, checks the honeypot and size limit, and maps CRM responses the same way. Detailed field validation is left to the CRM's 422 response. PHP 8.1+ with the cURL extension is required.

## How the contact form works

- The browser validates required fields, email format and consent, and shows an error summary and inline errors. The proxy validates again with the same `lead-rules.js`, and the CRM validates a third time.
- The payload follows the CRM contract exactly. Empty optional fields are left out. `page_url`, `referrer` and `utm.source/medium/campaign` are read from the current URL when the form is sent. No cookies or storage are used for attribution.
- How CRM responses reach the browser:

  | CRM | Browser | Visitor sees |
  | --- | --- | --- |
  | 201 | 201 + reference | Success message with the `WL-…` reference |
  | 422 | 422 + field errors | Errors next to the affected fields |
  | 429 | 429 | "Please try again in a few minutes" |
  | 404 (wrong secret), 5xx, timeout | 502 | Generic error with email and WhatsApp fallbacks; logged server-side |

- Spam protection: a hidden honeypot field (bots get a fake success and nothing is forwarded), a browser rate limit (10 s between requests, at most 5 per 10 minutes per tab), a per-IP limit on the Node server, the proxy's origin check and 16 KB size cap, and the CRM's own 429.

## Configuration you will need to change later

- **Meeting booking.** Set `BOOKING_URL` in `public/assets/js/site-config.js` once MTI supplies the approved booking link. "Book a Consultation" then becomes a link that opens in a new tab. Until then it opens the contact form with a short note. No calendar widget is shown.
- **Analytics.** Nothing is loaded. Every interaction calls `track(event, props)` in `site-config.js`, which pushes to `window.mtiDataLayer` and dispatches a `mti:track` DOM event. Events: `cta_click {label, target}`, `form_validation_error {fields}`, `form_submit_success {services, industry}`, `form_submit_error {status}`. Once the account IDs and consent model are approved:
  1. Add the vendor script as a file under `public/assets/js/` (or allow its domain in the CSP in `netlify.toml`, `server/node-server.mjs` and `.htaccess`).
  2. Subscribe: `document.addEventListener('mti:track', (e) => gtag('event', e.detail.event, e.detail));`
  3. Add a consent banner if the chosen tool sets cookies, and update the Cookie Policy page.
- **Legal pages.** `public/privacy.html`, `terms.html` and `cookies.html` are placeholders marked "to be completed by MTI AI SOLUTIONS" and use `noindex`. After adding the real text, remove `noindex` and add the pages to `sitemap.xml`.
- **Header or footer changes.** Edit them in `index.html`, then run `npm run build:pages` to regenerate the legal pages and `404.html`.
- **Inline script hash.** The only inline script (which adds the `js` class) is allowed by a CSP hash in `netlify.toml`, `server/node-server.mjs` and `server/php/.htaccess`. If you change that script, update the hash in all three files.
