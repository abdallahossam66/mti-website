# QA Report — MTI AI SOLUTIONS website

**Date:** 1 November 2026 · **Commit:** C3 (contact form + proxy + SEO + tests + checklist)
**How produced:** `npm run qa` ran every automated check. Raw outputs are in [docs/qa/](qa/) and the generated summary is [docs/qa/summary.md](qa/summary.md). The brief's checklist below was assessed item by item against that evidence.

## 1. Results at a glance

| Check | Result | Evidence |
| --- | --- | --- |
| Approved-copy fixture matches the brief PDF | **Pass**: 112/112 strings found in the PDF text | [qa/fixture.txt](qa/fixture.txt) |
| Unit tests (lead rules, proxy, Netlify adapter) | **Pass**: 22/22 | [qa/unit.txt](qa/unit.txt) |
| HTML validation (W3C Nu checker, 5 pages) | **Pass**: 0 errors, 0 warnings | [qa/html.txt](qa/html.txt) |
| Link check | **Pass**: 13 internal links/assets, 0 broken; 172 `#fragment` links, 0 broken | [qa/links.txt](qa/links.txt) |
| Colour contrast | **Pass**: 22/22 colour pairs in use meet WCAG 2.1 AA | [qa/contrast.txt](qa/contrast.txt) |
| Browser tests at 1440 and 390 px | **Pass**: 42 passed, 0 failed (12 skipped: viewport-specific tests run in one project only) | [qa/e2e.txt](qa/e2e.txt) |
| Mocked end-to-end submit (browser → real proxy → mock CRM) | **Pass** | `tests/e2e/submit.spec.js` |
| axe-core (WCAG 2.1 A/AA): home, FAQ open + form errors, mobile menu open, legal and 404 pages | **Pass**: 0 violations | `tests/e2e/a11y.spec.js` |
| PHP proxy smoke test | **Pass**: 8/8 checks | [qa/php.txt](qa/php.txt) |
| Lighthouse, mobile + desktop | **Pass**: every category ≥ 90 (see §2) | [lighthouse/](lighthouse/) |
| Screenshots | Done: 1440 and 390, full page, every section, and form states | [screenshots/](screenshots/) |

## 2. Lighthouse scores

Lighthouse 12, run against the local Node server (`npm run lighthouse`), with Lighthouse's default throttled mobile profile and the desktop preset.

| Form factor | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Mobile** | **98** | **100** | **100** | **100** | 1.6 s | 2.3 s | 0 ms | 0 | 2.5 s |
| **Desktop** | **100** | **100** | **100** | **100** | 0.4 s | 0.5 s | 0 ms | 0 | 0.4 s |

Full reports: [lighthouse/mobile.report.html](lighthouse/mobile.report.html) and [lighthouse/desktop.report.html](lighthouse/desktop.report.html).
The local server sends files uncompressed. Netlify (or nginx/Caddy on a VPS) adds gzip or brotli, so production transfer sizes will be smaller. Re-run Lighthouse on the live URL after launch.

Page weight (uncompressed / gzip): HTML 70.3 / 12.2 KB · CSS 37.2 / 8.5 KB · JS (5 modules) 27.4 / 10.8 KB · icon sprite 18.6 / 3.7 KB · Inter font 48.3 KB (preloaded). No third-party requests.

## 3. Unit tests: proxy requirements

| Requirement | Test(s) |
| --- | --- |
| Adds `X-Website-Secret` from the environment | "adds X-Website-Secret from the environment and forwards to {CRM_URL}/api/website/leads" |
| Forwards status codes | 201 + reference; 422 + field errors (unknown keys dropped); 429 + `Retry-After`; 404 → generic 502 + error log; 5xx, network error and timeout → 502 |
| Strips unknown fields | `budget`, `projected_budget`, honeypot key, `role`, `utm.extra` are removed before forwarding |
| Never logs the secret | Every test checks every log line, the response body and the response headers for the secret; the logger also redacts it |
| Also covered | Honeypot (201, CRM never called) · server-side validation 422 · 405/415/413/400/403 · `ALLOWED_ORIGINS` · Fetch `Headers` object (Netlify runtime) · missing config → 500 · lead personal data never logged |

## 4. Brief §04: Pre-launch acceptance checklist

| # | Checklist item (brief §04) | Result | How it was verified |
| --- | --- | --- | --- |
| 1 | Company name appears everywhere as MTI AI SOLUTIONS. | **Pass** | `content.spec.js` checks the page text, `<title>` and all `alt` text for any spelling of "MTI (PLUS) AI SOLUTION(S)" and finds only "MTI AI SOLUTIONS". The forbidden-terms check finds no "MTI PLUS". Note: the official logo SVGs from Logo Kit v1.1 (unmodified) contain an internal `<title>MTI AI Solutions</title>`, which is not exposed because each `<img>` has the alt text "MTI AI SOLUTIONS". |
| 2 | Official tagline is reproduced exactly: WHERE INDUSTRY MEETS INTELLIGENCE. | **Pass** | Present in the hero signature, footer, OG image and JSON-LD `slogan`; checked word for word. |
| 3 | All nine approved landing page sections are present in the agreed order. | **Pass** | Test: `main > section` ids = `home, challenges, solutions, industries, why-mti, how-we-work, technology, faq, contact`. |
| 4 | All eight solution categories and 12 industry categories are represented accurately. | **Pass** (with Q1/Q2 notes) | Card headings, footer links, the Industry dropdown and the service checkboxes equal the brief's strings exactly (unit and e2e tests). Each solution card shows the first three approved capabilities (Q2). The one-line card descriptions are drafts **pending MTI approval** (Q1, §6). |
| 5 | Projects & Case Studies and GU CART X are absent. | **Pass** | Forbidden-terms scan of the page text and `index.html` source ("Case Stud", "Projects &", "GU CART"). |
| 6 | No named Technology Stack list or logo strip appears. | **Pass** | §07 shows only the capability areas named in the brief. Scan for vendor and tool names (TensorFlow, PyTorch, OpenAI, LangChain, AWS, Azure, Google Cloud, Kubernetes, Docker, React, Python, Laravel) finds none. The only images on the page are the official logo. |
| 7 | No Project Budget / Projected Budget field appears in the contact form. | **Pass** | No control or label matches `budget`; the proxy removes a `budget` key if one is posted (unit, PHP and e2e tests); the CRM payload in the e2e test has no budget key. |
| 8 | Email, phone, Cairo office address, website, and LinkedIn links are correct. | **Pass** | `mailto:info@mtiaisolutions.com`, `tel:+201055778871` (shown as "+20 105 577 8871"), `https://wa.me/201055778871`, the address verbatim in `<address>`, `https://mtiaisolutions.com/`, `https://www.linkedin.com/company/mti-solutions-g/`. The link check got HTTP 200 from LinkedIn, WhatsApp and the current website. |
| 9 | Meeting booking is connected only after the approved booking destination is provided. | **Pass** (not connected) | `BOOKING_URL` is empty. "Book a Consultation" opens the contact form with a note; there is no calendar widget, iframe or availability (test). Set `BOOKING_URL` once MTI supplies the link. |
| 10 | All CTAs, forms, mobile layouts, analytics events, SEO metadata, and accessibility checks pass QA. | **Pass, except analytics: Pending owner** | **CTAs:** each goes to its target in the CTA map (PLAN §4.3); "Explore Solution" pre-ticks the service (test). **Forms:** validation, error summary, 422 mapping, 429, network/5xx errors, rate limit, honeypot, success with reference (tests). **Mobile:** designed layouts at 390 px with no horizontal scroll, and the mobile menu tested. **SEO:** title, description, canonical, OG/Twitter, JSON-LD, robots, sitemap; Lighthouse SEO 100. **Accessibility:** axe 0 violations, keyboard-only submission, visible focus, contrast; Lighthouse 100. **Analytics events:** the hook fires `cta_click`, `form_validation_error`, `form_submit_success` and `form_submit_error`, but no analytics tool is connected until MTI supplies IDs and a consent model (brief §03). |

## 5. Brief §03: Functional and technical requirements

| Area | Status | Notes |
| --- | --- | --- |
| Responsive design | Done | Mobile layouts designed separately (stacked hero CTAs, compact industry rows, vertical timeline, single-column form). See the 390 screenshots. |
| Navigation | Done | Sticky header; the logo returns to the top; anchors scroll to sections; scroll-spy uses `aria-current`; keyboard-accessible mobile menu. |
| CTA behaviour | Done | Primary CTAs go to the form; secondary CTAs scroll to sections; booking is a placeholder. |
| Forms | Done | Required fields, email format, consent, and clear success and error states. |
| CRM integration | Done; **CRM confirmations pending** | The proxy implements the contract. Form fields, landing-page URL, referrer and UTM values are captured; the CRM records the timestamp when it receives the lead. To confirm with the CRM team (PLAN Q13): that empty optional fields are left out, and the production `CRM_URL` and secret. |
| Lead notifications | **Pending CRM team** | Per Q14, the CRM notifies the sales inbox. The website never fails silently: every error is shown with email and WhatsApp fallbacks and logged server-side. Spam protection: honeypot, browser and server rate limits, origin check, server-side validation. |
| Analytics | **Pending owner** | Hook only; see README "Analytics". |
| SEO | Done | Lighthouse SEO 100 on mobile and desktop. |
| Performance | Done | Mobile Performance 98, CLS 0, no third-party requests, one preloaded font, reduced-motion support. |
| Accessibility | Done | Semantic landmarks, labels, visible focus, keyboard access, colour plus text and icon for every state, AA contrast. |
| Security and privacy | Done; **legal text pending** | HTTPS is provided by the host; strict CSP and security headers; the secret exists only server-side; minimal data collected (no budget); no cookies. The Privacy, Terms and Cookie pages are placeholders "to be completed by MTI". |
| Content governance | **Pending MTI sign-off** | See §6. |

## 6. Items pending MTI or CRM-team sign-off before launch

| Item | Where | Owner |
| --- | --- | --- |
| **Q1** Solution card descriptions (8 drafts, not brief copy) | `index.html` §03; listed in `tests/fixtures/brief-copy.json` → `solutionDescriptionsPendingApproval` | MTI |
| **Q5** Consent wording ("I agree that MTI AI SOLUTIONS may use the information I've provided to respond to my enquiry, as described in the Privacy Policy.") | Contact form | MTI / legal |
| **Q3** Cybersecurity capability claims (governance note in brief §03) | Solution card 08, technology card 08 | MTI |
| **Q6** Interface copy not in the brief: form heading "Discuss Your Project", "Send Message", success, error and booking-note messages, section eyebrows | Contact form, section labels | MTI (optional edits) |
| Privacy Policy, Terms & Conditions and Cookie Policy text | `privacy.html`, `terms.html`, `cookies.html` | MTI / legal |
| Booking URL | `site-config.js` → `BOOKING_URL` | MTI |
| Analytics account IDs and consent model | README "Analytics" | MTI |
| Production `CRM_URL`, `WEBSITE_FORM_SECRET`, sales-inbox notifications, confirmation that empty optional fields may be left out | Netlify environment variables, CRM | CRM team |
| GitHub repository URL (nothing has been pushed) | — | Owner |

## 7. Deviations from the plan

| Plan said | Built | Reason |
| --- | --- | --- |
| `robots.txt` disallows the placeholder pages | `robots.txt` allows them; the pages use `noindex` | A `Disallow` rule would stop crawlers from seeing the `noindex` tag, and the URLs could still be indexed from links. `/api/` is disallowed. |
| 30 s browser cooldown between requests | 10 s (still at most 5 per 10 minutes per tab) | A visitor fixing a 422 field error should be able to resend promptly. Server-side limits and the CRM's 429 still apply. |
| CSS ≤ 30 KB | 37.2 KB uncompressed (8.5 KB gzip) | One hand-written file with no build step. Lighthouse Performance is unaffected (98 mobile). |
| Node 20 LTS | Node ≥ 20.12 | `process.loadEnvFile()` (reads `.env` for `npm start`) needs 20.12. Netlify is pinned to Node 20. |

## 8. Known limitations

- Lighthouse and the link check were run locally. The OG image URL (`https://mtiaisolutions.com/assets/img/og-image.png`) returns 404 until this site is deployed to that domain, so re-check social previews after launch.
- The Netlify Function was not deployed to Netlify. Its adapter is unit-tested with a real Fetch `Request` (`tests/unit/netlify-adapter.test.mjs`), and the same core ran end to end through the Node adapter in the Playwright submit test.
- The Node server's rate limit is in memory (one process). On Netlify, rate limiting relies on the browser limit, the CRM's 429 and Netlify's platform protections.

## 9. Screenshots

Light theme only (the site has no dark mode). Files in [screenshots/1440/](screenshots/1440/) and [screenshots/390/](screenshots/390/):

`full-page.png` · `01-home.png` · `02-challenges.png` · `03-solutions.png` · `04-industries.png` · `05-why-mti.png` · `06-how-we-work.png` · `07-technology.png` · `08-faq.png` · `09-contact.png` · `10-footer.png` · `form-errors.png` · `form-success.png` · (390 only) `mobile-menu-open.png`
