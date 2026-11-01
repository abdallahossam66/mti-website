# QA Report — MTI AI SOLUTIONS website

**Date:** 1 November 2026 · **Commit:** G C4 (Germany office + DE/AR languages), building on C1–C3
**How produced:** `npm run qa` ran every automated check. Raw outputs are in [docs/qa/](qa/) and the generated summary is [docs/qa/summary.md](qa/summary.md). The brief's checklist below was assessed item by item against that evidence, for all three languages.

> **Translation status:** the German (`/de/`, `src/i18n/de.json`) and Arabic (`/ar/`, `src/i18n/ar.json`) pages are a **machine draft — pending MTI review**. English (`/`, `src/i18n/en.json`) is the approved brief copy and remains the source of truth. See §6.

## 1. Results at a glance

| Check | Result | Evidence |
| --- | --- | --- |
| Generated pages match the sources (template + en/de/ar JSON) | **Pass**: all 8 generated files up to date | [qa/build.txt](qa/build.txt) |
| Approved-copy fixture matches the brief PDF | **Pass**: 112/112 strings found in the PDF text | [qa/fixture.txt](qa/fixture.txt) |
| Unit tests (lead rules, proxy, Netlify adapter, translations) | **Pass**: 32/32 | [qa/unit.txt](qa/unit.txt) |
| HTML validation (W3C Nu checker, 7 pages incl. `/de/` and `/ar/`) | **Pass**: 0 errors, 0 warnings | [qa/html.txt](qa/html.txt) |
| Link check | **Pass**: 16 internal links/assets, 0 broken; 268 `#fragment` links, 0 broken | [qa/links.txt](qa/links.txt) |
| Colour contrast | **Pass**: 22/22 colour pairs in use meet WCAG 2.1 AA | [qa/contrast.txt](qa/contrast.txt) |
| Browser tests, EN/DE/AR at 1440 and 390 px | **Pass**: 101 passed, 0 failed (37 skipped: viewport-specific tests run in one project only) | [qa/e2e.txt](qa/e2e.txt) |
| Mocked end-to-end submit (browser → real proxy → mock CRM) from `/`, `/de/` and `/ar/` | **Pass**: the CRM receives the exact English enum strings from every language | `tests/e2e/submit.spec.js` |
| axe-core (WCAG 2.1 A/AA) on `/`, `/de/`, `/ar/` (RTL) at 1440 and 390: default, FAQ open + form errors, mobile menu open; legal and 404 pages | **Pass**: 0 violations | `tests/e2e/a11y.spec.js` |
| PHP proxy smoke test | **Pass**: 8/8 checks | [qa/php.txt](qa/php.txt) |
| Lighthouse, mobile + desktop, for `/`, `/de/`, `/ar/` | **Pass**: every category ≥ 90 on all six runs (see §2) | [lighthouse/](lighthouse/) |
| Screenshots | Done: EN, DE and AR at 1440 and 390: full page, every section, form states, mobile menu | [screenshots/](screenshots/) |

## 2. Lighthouse scores

Lighthouse 12, run against the local Node server (`npm run lighthouse`), with Lighthouse's default throttled mobile profile and the desktop preset.

| Page | Form factor | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Mobile | **96** | **100** | **100** | **100** | 1.8 s | 2.4 s | 10 ms | 0 | 2.7 s |
| `/` | Desktop | **100** | **100** | **100** | **100** | 0.4 s | 0.5 s | 0 ms | 0 | 1.1 s |
| `/de/` | Mobile | **96** | **100** | **100** | **100** | 1.9 s | 2.4 s | 20 ms | 0 | 2.8 s |
| `/de/` | Desktop | **100** | **100** | **100** | **100** | 0.4 s | 0.5 s | 0 ms | 0 | 0.6 s |
| `/ar/` | Mobile | **95** | **100** | **100** | **100** | 1.7 s | 2.6 s | 60 ms | 0 | 2.7 s |
| `/ar/` | Desktop | **100** | **100** | **100** | **100** | 0.4 s | 0.6 s | 0 ms | 0 | 0.7 s |

Full reports: `docs/lighthouse/<lang>-<mobile|desktop>.report.html` (e.g. [ar-mobile](lighthouse/ar-mobile.report.html)).
The local server sends files uncompressed. Netlify (or nginx/Caddy on a VPS) adds gzip or brotli, so production transfer sizes will be smaller. Re-run Lighthouse on the live URLs after launch. Mobile scores vary by a few points between runs on the same build (Speed Index especially).

Page weight (uncompressed / gzip): HTML 75.5 / 13.3 KB (en), 78.1 / 14.5 KB (de), 85.6 / 15.1 KB (ar) · CSS 41.2 / 9.5 KB · JS (5 modules) 30.9 / 10.8 KB · Inter 48.3 KB (preloaded everywhere) · Cairo 30.9 KB (preloaded on `/ar/` only). No third-party requests.

## 3. Unit tests

| Requirement | Test(s) |
| --- | --- |
| Adds `X-Website-Secret` from the environment | "adds X-Website-Secret from the environment and forwards to {CRM_URL}/api/website/leads" |
| Forwards status codes | 201 + reference; 422 + field errors (unknown keys dropped); 429 + `Retry-After`; 404 → generic 502 + error log; 5xx, network error and timeout → 502 |
| Strips unknown fields | `budget`, `projected_budget`, honeypot key, `role`, `utm.extra` are removed before forwarding |
| Never logs the secret | Every test checks every log line, the response body and the response headers for the secret; the logger also redacts it |
| Translations | `de.json` and `ar.json` have the same keys and array lengths as `en.json`, no empty strings, every `{placeholder}` kept, "MTI AI SOLUTIONS" never altered, the machine-draft status recorded; `en.json` equals the verified brief fixture; `en.json` field messages equal the proxy's English messages; no excluded terms (budget, case studies, guarantees, certifications) in any language |
| Also covered | Honeypot (201, CRM never called) · server-side validation 422 · 405/415/413/400/403 · `ALLOWED_ORIGINS` · Fetch `Headers` object (Netlify runtime) · missing config → 500 · lead personal data never logged · error codes localized via page messages |

## 4. Brief §04: Pre-launch acceptance checklist

Each item was checked on all three language pages unless stated otherwise.

| # | Checklist item (brief §04) | Result | How it was verified |
| --- | --- | --- | --- |
| 1 | Company name appears everywhere as MTI AI SOLUTIONS. | **Pass** (see note on "UG") | `content.spec.js` checks page text, `<title>`, `alt`, `aria-label` and meta content on `/`, `/de/` and `/ar/` for any spelling of "MTI (PLUS) AI SOLUTION(S)" and finds only "MTI AI SOLUTIONS". The translation unit test checks that every string using the name keeps it unchanged. **Note:** the owner-supplied Germany address names the legal entity "MTI AI SOLUTIONS UG" (German legal form). This is the company name plus a legal-form suffix, not a variant, but MTI should confirm it matches the commercial register entry (§6). The logo SVGs' internal `<title>MTI AI Solutions</title>` is not exposed (each `<img>` has alt text). |
| 2 | Official tagline is reproduced exactly: WHERE INDUSTRY MEETS INTELLIGENCE. | **Pass** | In English on every language page (brand rule): hero signature and footer (`lang="en"`), OG images, JSON-LD `slogan`. Checked by test on each page. |
| 3 | All nine approved landing page sections are present in the agreed order. | **Pass** | Test on each language: `main > section` ids = `home, challenges, solutions, industries, why-mti, how-we-work, technology, faq, contact`, with the brief's card counts (6/8/12/6+4/6/8/7). |
| 4 | All eight solution categories and 12 industry categories are represented accurately. | **Pass** (with Q1/Q2 notes) | EN: card headings, footer links, the Industry dropdown and the service checkboxes equal the brief's strings exactly. DE/AR: labels come from the translation files (pending MTI review), and the form values sent to the CRM are the exact English strings (test on every page). The solution card descriptions are drafts **pending MTI approval** (Q1). |
| 5 | Projects & Case Studies and GU CART X are absent. | **Pass** | Forbidden-terms scan of page text and HTML source per language (EN list plus German and Arabic equivalents). |
| 6 | No named Technology Stack list or logo strip appears. | **Pass** | §07 shows only the capability areas named in the brief, translated in DE/AR. Vendor and tool scan (TensorFlow, PyTorch, OpenAI, LangChain, AWS, Azure, Google Cloud, Kubernetes, Docker, Python, Laravel, and React on EN) finds none on any page. |
| 7 | No Project Budget / Projected Budget field appears in the contact form. | **Pass** | No control or label matches `budget` on any page; the proxy strips a `budget` key (unit, PHP, e2e tests); German "Budget" and Arabic "ميزانية" are absent. |
| 8 | Email, phone, Cairo office address, website, and LinkedIn links are correct. | **Pass** | Identical on all pages: `mailto:info@mtiaisolutions.com`, `tel:+201055778871` ("+20 105 577 8871"), `https://wa.me/201055778871`, the Cairo address verbatim, `https://mtiaisolutions.com/`, `https://www.linkedin.com/company/mti-solutions-g/`. The link check got HTTP 200 from LinkedIn, WhatsApp and the current website. The Germany office address is also verbatim on every page (contact block and footer), but it comes from the owner, not the brief (§6). |
| 9 | Meeting booking is connected only after the approved booking destination is provided. | **Pass** (not connected) | `BOOKING_URL` is empty; "Book a Consultation" opens the form with a translated note; no calendar widget or iframe (tests). |
| 10 | All CTAs, forms, mobile layouts, analytics events, SEO metadata, and accessibility checks pass QA. | **Pass, except analytics: Pending owner** | **CTAs and forms:** tested on every language (validation, translated messages, 422/429/5xx/network, rate limit, honeypot, success with reference). **Mobile:** no horizontal scroll on any language at 390 px (test); mobile menu with the language switcher tested in RTL. **SEO:** per-language title, description, canonical, `hreflang` en/de/ar/x-default, OG/Twitter (per-language image), JSON-LD with both offices, sitemap with alternates; Lighthouse SEO 100 on all six runs. **Accessibility:** axe 0 violations on all pages and states, keyboard-only submission, visible focus, contrast; Lighthouse 100. **Analytics:** hook only until MTI supplies IDs and a consent model. |

## 5. Brief §03: Functional and technical requirements

| Area | Status | Notes |
| --- | --- | --- |
| Responsive design | Done | Mobile layouts designed separately; German long words hyphenate inside cards; Arabic mirrors. See the 390 screenshots per language. |
| Navigation | Done | Sticky header; logo returns to the top of the current language page; EN / DE / AR switcher (plain links, no cookies, no storage, no redirect), `aria-current="page"` plus underline on the current language; mobile menu below 1280 px. |
| CTA behaviour | Done | As before, on every language. |
| Forms | Done | Labels and messages in the page language; values sent to the CRM always the English enums; country names localized while values stay ISO codes. |
| CRM integration | Done; **CRM confirmations pending** | Unchanged contract. `page_url` now tells the CRM which language page the lead came from (`/`, `/de/`, `/ar/`). |
| Lead notifications | **Pending CRM team** | Unchanged (Q14). |
| Analytics | **Pending owner** | Hook only. |
| SEO | Done | `hreflang` alternates and `x-default` on every page and in the sitemap. |
| Performance | Done | Mobile Performance ≥ 95 on all three pages, CLS 0. Cairo is downloaded only on `/ar/`. |
| Accessibility | Done | Plus `lang`/`dir` on every page, `lang="en"` on English brand fragments, `<bdi>` isolation for phone, email and Latin addresses in RTL, no letter-spacing on Arabic text. |
| Security and privacy | Done; **legal text pending** | Unchanged. The switcher sets no cookies. |
| Content governance | **Pending MTI sign-off** | See §6, including the translations and the Germany office. |

## 6. Items pending MTI or CRM-team sign-off before launch

| Item | Where | Owner |
| --- | --- | --- |
| **German translation: machine draft, pending MTI review** | `src/i18n/de.json` → `/de/` | MTI (native German reviewer) |
| **Arabic translation: machine draft, pending MTI review** | `src/i18n/ar.json` → `/ar/` | MTI (native Arabic reviewer) |
| **Germany office.** Owner-supplied, not in brief Release 1.0. Confirm the registered name "MTI AI SOLUTIONS UG" and the address. A company with a German establishment addressing German visitors will typically need a German **Impressum** (legal notice: entity, address, managing director, register entry, VAT ID), which the brief's footer does not include. | Contact details, footer, JSON-LD | MTI / legal |
| **Q1** Solution card descriptions (8 drafts, not brief copy), in all languages | `src/i18n/*.json` → `solutions.categories[].description` | MTI |
| **Q5** Consent wording, in all languages | `src/i18n/*.json` → `form.consent` | MTI / legal |
| **Q3** Cybersecurity capability claims | Solution card 08, technology card 08 | MTI |
| **Q6** Interface copy not in the brief (form heading, button, messages, section eyebrows) | `src/i18n/*.json` | MTI (optional edits) |
| Privacy Policy, Terms & Conditions and Cookie Policy text (currently English-only placeholders, linked from all three languages) | `scripts/build-site.mjs` → `privacy.html`, `terms.html`, `cookies.html` | MTI / legal |
| Booking URL | `site-config.js` → `BOOKING_URL` | MTI |
| Analytics account IDs and consent model | README "Analytics" | MTI |
| Production `CRM_URL`, `WEBSITE_FORM_SECRET`, sales-inbox notifications, confirmation that empty optional fields may be left out | Netlify environment variables, CRM | CRM team |

## 7. Deviations from the plan

| Plan said | Built | Reason |
| --- | --- | --- |
| No build step | HTML is generated by `npm run build` from `src/` (owner request: one template + three string files). The generated files are committed, so Netlify and VPS hosting still need no build; `npm run build:check` guards against stale output. | C4 owner instruction. |
| Mobile menu below 1100 px | Below 1280 px | The German navigation plus the language switcher need the extra width to stay on one row. |
| `robots.txt` disallows the placeholder pages | `robots.txt` allows them; the pages use `noindex` | A `Disallow` rule would stop crawlers from seeing the `noindex` tag. `/api/` is disallowed. |
| 30 s browser cooldown between requests | 10 s (still at most 5 per 10 minutes per tab) | A visitor fixing a 422 field error should be able to resend promptly. |
| CSS ≤ 30 KB, HTML ≤ 70 KB | CSS 41.2 KB (9.5 KB gzip); HTML 75–86 KB (13–15 KB gzip) | RTL, language and office styles; the per-language message data block. Lighthouse Performance stays ≥ 95. |
| Node 20 LTS | Node ≥ 20.12 | `process.loadEnvFile()` for `npm start`. |

## 8. Known limitations

- Lighthouse and the link check were run locally. The OG image URLs (`og-image.png`, `og-image-de.png`, `og-image-ar.png` on `https://mtiaisolutions.com`) return 404 until this site is deployed to that domain.
- The Netlify Function was not deployed to Netlify. Its adapter is unit-tested with a real Fetch `Request`, and the same core ran end to end through the Node adapter in the Playwright submit tests.
- CRM and proxy validation messages are in English. On `/de/` and `/ar/` the form shows the page-language message for each field the CRM rejects, instead of the CRM's English wording.
- The legal placeholder pages and 404 are English-only.
- German hyphenation relies on the browser's dictionary (`hyphens: auto` with `lang="de"`). Where a browser has none, words wrap at break opportunities instead, and nothing overflows (test).
- The Node server's rate limit is in memory (one process).

## 9. Screenshots

Light theme only (the site has no dark mode). Every folder contains `full-page.png`, `01-home.png` … `09-contact.png`, `10-footer.png`, `form-errors.png` and `form-success.png`; the 390 folders also contain `mobile-menu-open.png`.

| Language | 1440 px | 390 px |
| --- | --- | --- |
| English | [screenshots/1440/](screenshots/1440/) | [screenshots/390/](screenshots/390/) |
| German | [screenshots/de/1440/](screenshots/de/1440/) | [screenshots/de/390/](screenshots/de/390/) |
| Arabic (RTL) | [screenshots/ar/1440/](screenshots/ar/1440/) | [screenshots/ar/390/](screenshots/ar/390/) |
