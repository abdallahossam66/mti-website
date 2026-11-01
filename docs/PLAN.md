# MTI AI SOLUTIONS — Public Website: Implementation Plan

**Status:** Approved by the owner on 1 November 2026. All open questions take the Recommended answer; Q1 and Q5 drafts are pending MTI sign-off.
**Date:** 31 October 2026
**Source of truth:** *Landing Page Master Brief*, Release 1.0, 30 October 2026 (`brief/Landing_Page_Master_Brief.pdf`). Brand rules come from *MTI CRM Brand Identity & Design System*, Release 1.0, and *MTI Logo Kit v1.1*.

---

## 1. Scope at a glance

| In scope (this version) | Out of scope |
| --- | --- |
| One English landing page with the nine brief sections (§01–§09) in the brief's order | Arabic version (Cairo is loaded, but no Arabic content) |
| Contact form → `/api/contact` proxy → CRM `POST /api/website/leads` | Individual solution or industry pages |
| Netlify Function proxy (default), plus a plain Node server and a PHP script for a VPS | Blog, CMS, booking-widget integration |
| Placeholder Privacy / Terms / Cookie pages marked "To be completed by MTI" | Analytics IDs and events (a documented hook only) |
| SEO, performance, accessibility, tests, QA report, screenshots | Legal page text |

**Must be absent** (brief §01, §02, §07, §09): Projects & Case Studies, GU CART X, any named technology list or logo strip, any budget field, and any unverified logos, testimonials, certifications, statistics, guarantees or claims. This also rules out wording from the CRM brand guide that is not in the brief: the "industrial operations" positioning statement, "ISO 27001", and the sample CRM figures and client names.

---

## 2. Repository structure

Plain static site with **no runtime framework and no build step**. Hand-written HTML, CSS and ES modules are fast enough for a single page to reach Lighthouse ≥ 90, and leave nothing to configure. Tooling (`npm`) is used only for tests, QA and the local server.

```
mti-website/
├── public/                         ← deploy root (Netlify "publish")
│   ├── index.html                  ← the nine sections
│   ├── privacy.html  terms.html  cookies.html   ← placeholders, noindex
│   ├── 404.html
│   ├── robots.txt  sitemap.xml  site.webmanifest
│   └── assets/
│       ├── css/main.css            ← tokens + base + components (one file, ~25 KB)
│       ├── js/
│       │   ├── main.js             ← header, mobile nav, scroll-spy, accordion, CTA wiring
│       │   ├── form.js             ← validation, payload, submit, UI states, rate limit
│       │   ├── lead-rules.js       ← SHARED (browser + proxy): approved lists, limits, validate()
│       │   ├── countries.js        ← ISO 3166-1 alpha-2 codes + English names (generated once, committed)
│       │   └── site-config.js      ← BOOKING_URL = "", analytics hook
│       ├── img/
│       │   ├── logo-primary.svg  logo-reversed.svg  mark.svg  mark-reversed.svg   ← from the brand kit, unmodified
│       │   ├── icons.svg           ← SVG sprite (~40 line icons)
│       │   └── og-image.png        ← 1200×630
│       ├── icons/                  ← favicon.ico, favicon.svg, favicon-small.svg, app-icon-180/192/512.png
│       └── fonts/                  ← inter-latin-var.woff2, cairo-arabic-var.woff2 (self-hosted, OFL)
├── lib/
│   └── lead-proxy.mjs              ← platform-neutral proxy core: handleLead(request, deps) → response
├── netlify/functions/contact.mjs   ← Netlify adapter (Functions v2, path /api/contact)
├── server/
│   ├── node-server.mjs             ← VPS / local: serves public/ + /api/contact (zero dependencies)
│   └── php/api/contact.php         ← VPS alternative for PHP hosts (~80 lines, cURL)
├── tests/
│   ├── unit/                       ← node:test: lead-rules, lead-proxy
│   ├── e2e/                        ← Playwright: form, a11y, keyboard, content, mocked end-to-end submit
│   ├── fixtures/brief-copy.json    ← approved copy extracted from the brief, checked word for word
│   └── mock-crm.mjs                ← local fake CRM that records requests
├── scripts/                        ← validate-html, check-links, lighthouse, screenshots, contrast
├── docs/
│   ├── PLAN.md                     ← this file
│   ├── QA-REPORT.md                ← test output, Lighthouse scores, §04 checklist results
│   ├── lighthouse/                 ← mobile + desktop HTML/JSON reports
│   └── screenshots/1440/ · 390/    ← full page + one per section
├── netlify.toml  package.json  .env.example  .gitignore  README.md
```

---

## 3. Brand and design system

### 3.1 Tokens (`:root` in `main.css`)

| Token | Value | Use on the site |
| --- | --- | --- |
| `--mti-navy` | #0D1B3E | Hero, Technology, Contact and footer backgrounds; headings on light surfaces |
| `--mti-blue` | #1E6FD9 | Primary buttons, links (on white only, see 3.2), focus rings, active states |
| `--mti-gold` | #C8922A | Accents **on navy only**: hero tagline, stage-number badges, highlight rules |
| `--mti-cyan` | #00C8FF | Tech highlights **on navy only**; decorative lines and network nodes |
| `--mti-white` | #FFFFFF | Cards, light sections |
| `--mti-off-white` | #F4F6FB | Page canvas, alternate sections |
| `--mti-text-mid` | #3A4468 | Secondary body text on light surfaces (from the brand guide, 8.8:1 on off-white) |
| `--mti-gradient` | linear-gradient(90deg, gold, blue, cyan) | Header top bar (5 px) and a few accent rules, used sparingly |
| `--mti-radius-sm/md` | 4 px / 8 px | Inputs and buttons / cards |
| `--mti-shadow-sm` | 0 2px 8px rgba(13,27,62,.08) | Card elevation |
| spacing | 8 px base scale (8, 16, 24, 32, 48, 64, 96) | Brand guide "Base-8" |

**Typography.** Inter variable font, self-hosted, latin subset, preloaded, `font-display: swap`, with a metric-matched system fallback stack (`"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`). Cairo is declared with an Arabic `unicode-range`, so browsers download it only if Arabic text ever appears; it costs nothing in this version. The brand guide's type scale was written for a dense CRM (13 px body), so the website adapts it: body 17 px / 1.6, H1 `clamp(2.25rem, 5vw, 3.75rem)` weight 800 at −0.02em, H2 `clamp(1.75rem, 3.5vw, 2.75rem)` weight 800, H3 1.125–1.25 rem weight 700, eyebrow labels 0.75 rem weight 700 at +0.12em uppercase.

**Logo.** Official SVGs from Logo Kit v1.1, copied unchanged. The header uses the reversed logo on navy. Rendered at ≥ 140 px wide (160 px on mobile), with clear space ≥ the cap height of "M" on every side, enforced by padding on the logo wrapper. The hexagon mark and the 20 px tech-matrix grid appear as low-opacity background motifs in the Hero, Technology and Contact sections. There is no dark mode.

### 3.2 Contrast rules (measured with the WCAG 2.1 formula)

| Pair | Ratio | Rule |
| --- | --- | --- |
| Navy on white / off-white | 16.89 / 15.62 | Unrestricted |
| White on navy | 16.89 | Unrestricted |
| White on Brand Blue (buttons) | 4.85 | Passes AA |
| Blue text on white | 4.85 | Passes AA. Blue links and "Explore Solution" sit on white cards. |
| **Blue text on off-white** | **4.48** | **Fails AA by a hair.** No blue body or link text on off-white; use navy text with a blue underline, or a white card. |
| Blue on navy | 3.48 | Non-text and large text only (e.g. timeline connectors) |
| Gold on navy | 6.11 | OK for small text |
| Gold on white / off-white | 2.76 / 2.56 | **Never as text**, any size. Stage numbers sit inside navy hexagon badges. |
| Cyan on navy | 8.61 | OK |
| Cyan on white | 1.96 | Decorative only |

State is never shown by colour alone. Errors get an icon, text and `aria-invalid`. The open/closed state of an accordion item uses a +/− glyph and `aria-expanded`. The active nav item gets an underline and `aria-current`. Focus is a 3 px Brand Blue outline with 2 px offset, switching to white or cyan on navy surfaces.

---

## 4. Page structure and components

### 4.1 Global

| Component | Behaviour |
| --- | --- |
| **Skip link** | "Skip to main content", first focusable element |
| **Header** (`<header>`, sticky) | Navy background, 5 px gradient top bar. The logo links to `#home` and has alt text "MTI AI SOLUTIONS – Home". Nav: Solutions · Industries · Why MTI · How We Work · Technology · FAQ, plus a "Discuss Your Project" button. Below 1100 px the nav collapses behind a menu button (`aria-expanded`, `aria-controls`; closes on Escape, on clicking a link, or on clicking outside; focus returns to the button). Scroll-spy sets `aria-current="location"` on the visible section. `scroll-margin-top` keeps anchored headings below the sticky header. |
| **Section shell** | `<section id aria-labelledby>`, eyebrow label, `<h2>` headline (approved copy), supporting `<p>`, body, closing statement, CTA |
| **Button / link-button** | Primary: blue fill, white text. Secondary: outline (white outline on navy, navy outline on light). Minimum target 44 × 44 px. |
| **Icon** | `<svg aria-hidden="true"><use href="assets/img/icons.svg#…">`. Icons are decorative; the visible text carries the meaning. |
| **Footer** | Navy. Brand line, Company / Solutions / Industries / Connect / Legal columns, copyright line (all verbatim from the brief). |
| **Placeholder pages** | Privacy / Terms / Cookies use the shared header and footer, an H1 and the line "This page is to be completed by MTI AI SOLUTIONS." Marked `noindex` and kept out of the sitemap. |

### 4.2 Sections (IDs, content and layout)

All headlines, supporting text, card copy and closing statements are taken verbatim from the brief and checked by `tests/fixtures/brief-copy.json`.

| # | `id` | Contents | Desktop layout | 390 px layout (designed for mobile, not shrunk) |
| --- | --- | --- | --- | --- |
| 01 | `home` | Brand signature (MTI AI SOLUTIONS / WHERE INDUSTRY MEETS INTELLIGENCE, gold on navy) · **H1** "Transforming Businesses Through Artificial Intelligence." · supporting text · two CTAs · an abstract network of connected hexagon nodes in inline SVG (sector-neutral: no factories, no stock photos) | Text on the left, network visual on the right, navy with matrix grid | Text first, full-width stacked CTAs, visual reduced to a short decorative band below the CTAs |
| 02 | `challenges` | Headline · text · **6 challenge cards** (icon, name, description) · closing statement | 3 × 2 grid, white cards on off-white, blue icons, cyan accent rule, subtle hover lift | Single column, icon beside the title to keep cards short |
| 03 | `solutions` | Headline · text · **8 solution cards** (icon, number, category name, concise description, ≤ 3 highlights, "Explore Solution") · closing statement · CTA "Explore Our Capabilities" | 4 × 2 grid (2 × 4 on tablet), white | Single column |
| 04 | `industries` | Headline · text · **12 industry cards** (icon, name, the two illustrative focus areas) · closing statement · CTA "Explore Industry Solutions" | 4 × 3 grid, white cards on off-white, navy icon tiles with cyan detail | Compact rows with the icon on the left, name and focus areas on the right |
| 05 | `why-mti` | Headline · text · **6 advantage cards** (verbatim approved copy) · "Our working philosophy" strip: "From Business Challenges to Intelligent Solutions." with 4 steps (01 Understand … 04 Evolve) · closing statement · CTA "Let's Discuss Your Business" | 3 × 2 cards; philosophy as a navy band with 4 connected steps and gold numbers | Single-column cards; philosophy steps stacked |
| 06 | `how-we-work` | Headline · text · **6-stage timeline** as an ordered list (`<ol>`), each stage with a journey label (Discovery … Optimization), title and description · closing statement · CTA "Start Your Project" | Horizontal 6-step timeline (3 × 2 on tablet): navy line, blue connectors, gold numbers in navy hexagon badges, cyan dots | Vertical timeline with the line on the left |
| 07 | `technology` | Dark navy · headline · text · **8 capability cards**, each listing its five capability areas exactly as the brief names them · closing statement · CTA "Explore Our Capabilities". No product, vendor or framework names. | 4 × 2 grid, translucent navy cards, gold/cyan highlights, hexagon/network motif; restrained animation (slow node pulse), off under `prefers-reduced-motion` | Single column |
| 08 | `faq` | Headline · text · **7-item accordion** (verbatim Q&A) | Centred column (max 800 px) on white | Full width |
| 09 | `contact` | Navy · headline · text · CTAs "Discuss Your Project" / "Book a Consultation" · **contact form** on a white card · official contact details · then the `<footer>` | Two columns: intro, CTAs and contact details on the left, form on the right | Intro, then CTAs, then form, then details |

**FAQ accordion** follows the WAI-ARIA APG accordion pattern: `<h3><button aria-expanded aria-controls>` with a `role="region"` panel. Several items can be open at once. Enter/Space toggles. Height animates smoothly unless reduced motion is requested. Without JavaScript all answers are visible.

### 4.3 CTA map

| CTA | Target | Notes |
| --- | --- | --- |
| Header "Discuss Your Project" | `#contact` | |
| Hero "Discuss Your Project" (primary) | `#contact`, focus moves to the form heading | |
| Hero "Explore Our Solutions" (secondary) | `#solutions` | |
| §03 card "Explore Solution" ×8 | `#contact`, with that service pre-ticked under Interested Service | Each link's accessible name includes the category, e.g. "Explore Solution: Custom Software Development". Point it at the solution page once those pages exist. |
| §03 "Explore Our Capabilities" | `#technology` | |
| §04 "Explore Industry Solutions" | `#solutions` | Industry cards are not links (there are no industry pages yet) |
| §05 "Let's Discuss Your Business" | `#contact` | |
| §06 "Start Your Project" | `#contact` | |
| §07 "Explore Our Capabilities" | `#solutions` | See open question Q9 |
| §09 "Discuss Your Project" | Focus moves to the Full Name field | |
| §09 "Book a Consultation" | **Placeholder:** a `<button>` that moves focus to the form and shows a note: "Online booking will be available soon. Send us your details and our team will arrange a meeting time." | Once `BOOKING_URL` is set in `site-config.js`, it becomes a link to that URL (new tab, labelled as such). No calendar widget and no availability shown. |
| Footer Company | About Us → `#why-mti`, Our Approach → `#how-we-work`, Contact Us → `#contact` | See Q10 |
| Footer Solutions / Industries | `#solution-<slug>` / `#industry-<slug>` card anchors | |
| Footer Connect | LinkedIn (company page URL from the brief) · `mailto:info@mtiaisolutions.com` · WhatsApp `https://wa.me/201055778871` | External links use `rel="noopener"`; the phone is shown as "+20 105 577 8871" and linked with `tel:+201055778871` in the contact block |
| Footer Legal | `privacy.html` · `terms.html` · `cookies.html` | |

---

## 5. Contact form

### 5.1 Fields

| Label (on screen) | Control | Required | CRM key | Client rule |
| --- | --- | --- | --- | --- |
| Full Name | `input text`, `autocomplete=name` | Yes | `name` | 1–120 chars after trimming |
| Business Email | `input email`, `autocomplete=email` | Yes | `business_email` | ≤ 190 chars, email format |
| Company Name | `input text`, `autocomplete=organization` | **Yes** (see Q4) | `company` | 1–160 chars |
| Phone Number | `input tel`, `autocomplete=tel` | No | `phone` | ≤ 40 chars; digits, spaces, `+ ( ) - .` |
| Country | `select` from the bundled ISO list, placeholder "Select country" | No | `country` | Valid alpha-2 |
| Industry | `select` of the 12 approved strings | No | `industry` | Exact match |
| Interested Service | **Checkbox group** in a `<fieldset>` with 8 approved strings | No | `interested_services` | Each item an exact match; no duplicates |
| Project Timeline | `select`: As soon as possible / Within 3 months / 3–6 months / 6–12 months / Not decided yet | No | `timeline` | Exact match (with an en dash, U+2013) |
| Tell Us About Your Project | `textarea` with a live character count | No | `message` | ≤ 4000 chars |
| Consent | `checkbox` linking to the Privacy Policy | Yes | `consent: true` | Must be ticked |
| *(honeypot)* | Hidden text input `company_website`, `tabindex=-1`, `autocomplete=off`, `aria-hidden` | — | never sent | Must be empty |

A checkbox group is used instead of `<select multiple>`. It is far more usable on touch screens and with screen readers, and it still sends a multi-select array.

**There is no budget field**, and the proxy rejects one if it appears (it is stripped as an unknown key).

**Values sent automatically:** `page_url` (`location.href`, max 500 chars), `referrer` (`document.referrer`, max 500), `utm.{source,medium,campaign}` (read from the current URL's `utm_*` parameters when the form is submitted, max 120 each). The site sets no cookies and uses no storage for attribution, so no consent banner is needed. The CRM records the timestamp when it receives the lead (the contract has no timestamp field, and extra fields are rejected).

### 5.2 Validation and states

- **Validation:** native constraint attributes plus `novalidate` and custom messages from `lead-rules.js`. Fields are validated when they lose focus (once touched) and all together on submit.
- **On a failed submit:** an error summary (`role="alert"`) appears above the form, listing each problem as a link to its field, and focus moves to the summary. Each field also gets an inline error with a ⚠ icon and text, `aria-invalid="true"` and `aria-describedby`.
- **Submitting:** the button is disabled, reads "Sending…" and sets `aria-busy`.
- **201:** the form is replaced by a success panel (`role="status"`, focused): "Thank you. We've received your enquiry. Your reference number is **WL-…**. Our team will contact you shortly."
- **422:** each `errors[field]` entry is mapped to its field's inline error and to the summary. Unknown keys fall back to the general message.
- **429:** "We've received several requests from your connection. Please try again in a few minutes."
- **Network error, timeout or 5xx/502:** "We couldn't send your message right now. Please try again, or contact us directly at info@mtiaisolutions.com or on WhatsApp +20 105 577 8871." Nothing fails silently. The values the user typed are kept.
- **Browser-side rate limit:** one request in flight at a time; a 30 s cooldown after each attempt; at most 5 attempts per 10 minutes per tab (counter kept in `sessionStorage`, which counts as strictly necessary). When the limit is hit, a text message says how long to wait.
- **Honeypot filled:** the client shows the normal success state and sends nothing.

---

## 6. Proxy design (`/api/contact`)

The secret exists only as the server-side environment variable `WEBSITE_FORM_SECRET`. It never appears in the browser, the repo, responses or logs.

### 6.1 Core: `lib/lead-proxy.mjs`

`handleLead({ method, headers, body }, { env, fetch, log }) → { status, headers, body }` is a pure function with injected dependencies. It is unit-tested directly and wrapped by thin adapters for Netlify and Node.

1. Accept `POST` only; anything else gets **405**.
2. Configuration check: if `CRM_URL` or `WEBSITE_FORM_SECRET` is missing, return **500** with a generic message and log the *names* of the missing variables.
3. Origin check: compare `Origin` against `ALLOWED_ORIGINS` (optional, comma-separated). If that is not set, `Origin` must match the request host. A mismatch gets **403**.
4. Require `Content-Type: application/json` (else **415**) and a body ≤ 16 KB (else **413**). Invalid JSON gets **400**.
5. Honeypot: if `company_website` is non-empty, return **201** `{"status":"received"}` without forwarding, and log `honeypot` with no form contents.
6. Sanitise: keep only the allowed keys (`name, business_email, company, phone, country, industry, interested_services, timeline, message, consent, page_url, referrer, utm.{source,medium,campaign}`); drop everything else (budget, honeypot, any nested extras); trim strings; leave out empty optional fields.
7. Validate with the shared `lead-rules.js` (the same rules as the browser). Failures get **422** in the CRM's shape `{"message", "errors": {field: [..]}}`. This is the server-side validation required by brief §03.
8. Forward: `POST {CRM_URL}/api/website/leads` with `Content-Type: application/json`, `Accept: application/json`, `X-Website-Secret: <secret>`, and a 10 s timeout (`AbortController`).
9. Map the CRM response to the browser:

| CRM response | Proxy → browser | Logged (no secret, no form contents) |
| --- | --- | --- |
| 201 | 201 `{status, reference}` | `lead forwarded ref=WL-…` |
| 422 | 422 `{message, errors}` (only known field keys) | `crm 422 fields=[…]` |
| 429 | 429 `{message}`, with `Retry-After` passed through | `crm 429` |
| 404 | **502** generic error | `crm 404 — check WEBSITE_FORM_SECRET / CRM_URL` (error level) |
| other 4xx/5xx, network error, timeout | **502** generic error | status or error class |

**Logging hygiene:** the logger wraps `console` and replaces any occurrence of the secret value with `[redacted]` as a second line of defence. Request headers and lead PII (name, email, phone, message) are never logged, which keeps personal data out of function logs.

### 6.2 Adapters

| Target | File | Notes |
| --- | --- | --- |
| **Netlify (default)** | `netlify/functions/contact.mjs` | Functions v2 (`export default async (req) => …`, `export const config = { path: "/api/contact" }`), Node 20. `netlify.toml`: `publish = "public"`, security headers (strict CSP with `default-src 'self'`, HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'`) and long caching for `/assets/*`. |
| **Node on a VPS / local dev** | `server/node-server.mjs` | Zero dependencies. `node --env-file=.env server/node-server.mjs` serves `public/` with the same headers, mounts `/api/contact`, and adds an in-memory per-IP limit (5 per 10 min). It runs behind Caddy or nginx for HTTPS; the README includes a systemd unit and nginx snippet. |
| **PHP on a VPS** | `server/php/api/contact.php` | For shared or PHP hosts: POST only, a size cap, a key whitelist, the honeypot, cURL forwarding with the header from `getenv()`, and the same status mapping and log redaction. Detailed validation is left to the CRM's 422 (it does not share the JS module). Covered by the PHP smoke test. |

---

## 7. SEO, performance, accessibility, analytics

- **SEO:** `<title>`: "MTI AI SOLUTIONS — AI, Automation & Custom Software for Businesses". Meta description: about 155 characters, drawn from the hero supporting text. Canonical `https://mtiaisolutions.com/`. Open Graph and Twitter `summary_large_image` tags with `og-image.png` (reversed logo and tagline on navy). Organization JSON-LD using only verified brief details (name, URL, logo, email, phone, Cairo address, LinkedIn `sameAs`). `robots.txt` allows everything except the placeholder pages and links to the sitemap. `sitemap.xml` lists `/` only until the legal pages are completed. One H1, an H2 per section, H3 for cards.
- **Performance budget (mobile):** HTML ≤ 70 KB, CSS ≤ 30 KB, JS ≤ 25 KB (module, `defer`), fonts ≤ 110 KB (one preloaded woff2), no raster image above the fold (the hero visual is inline SVG). Images below the fold use `loading="lazy"` with explicit width and height, so there is no layout shift. No third-party requests at runtime. Animations use CSS transforms and opacity only and respect `prefers-reduced-motion`.
- **Accessibility:** semantic landmarks, skip link, visible focus, logical tab order, labels and descriptions on every field, meaningful alt text (decorative SVG hidden from assistive technology), 44 px targets, reflow at 320 px, text zoom to 200%. Target: zero axe-core violations.
- **Analytics hook:** `site-config.js` exports `track(event, props)`. It pushes to `window.mtiDataLayer` and dispatches a `mti:track` DOM event, and makes **no network calls**. It fires on `cta_click` (with label and target), `form_submit_success`, `form_submit_error` (with status) and `form_validation_error`. The README explains how to connect GA4, Plausible or similar once IDs and the consent model are supplied; a consent banner becomes necessary only at that point.

---

## 8. Test list

| # | Test | Tool | Pass criterion |
| --- | --- | --- | --- |
| T1 | HTML validation of all `.html` files | W3C Nu validator (`vnu-jar`; Java 21 is installed) | 0 errors |
| T2 | Link check (internal pages, `#anchors`, assets; external links reported) | `linkinator` against the local server | 0 broken internal links or anchors; external results listed (LinkedIn often blocks bots with a 999 and is checked by hand) |
| T3 | Lighthouse, mobile and desktop | `lighthouse` CLI with local Chrome | ≥ 90 in all four categories; scores pasted into QA-REPORT, HTML reports in `docs/lighthouse/` |
| T4 | Unit: `lead-rules` | `node:test` | Required fields, lengths, email format, exact enum strings (including the en dash), alpha-2 codes, consent `true` |
| T5 | Unit: proxy core | `node:test`, mocked `fetch` and spy logger | **Adds `X-Website-Secret` from env** · forwards to `{CRM_URL}/api/website/leads` (with or without a trailing slash) · **forwards 201 + reference, 422 + errors, 429 + Retry-After** · 404 / 5xx / network error / timeout → 502 generic · **strips unknown fields** (`budget`, honeypot, `utm.extra`, `__proto__`) · honeypot → 201 and fetch never called · 405 / 413 / 415 / 400 / 403 · missing env → 500 · **secret never appears in any log line or response body** (checked across every scenario) |
| T6 | Form behaviour in the browser | Playwright | Required and format errors, error summary focus and links, `aria-invalid`, consent required, service pre-tick from "Explore Solution", 422 mapping, 429 message, network error with fallback contacts, rate-limit message, honeypot, success state shows the reference |
| T7 | **Mocked end-to-end submit** | Playwright + `node-server.mjs` + `tests/mock-crm.mjs` | The real browser fills the form, the real proxy runs, and the fake CRM receives exactly the contract payload with the secret header. The UI shows `WL-TEST-0001`. |
| T8 | PHP proxy smoke test | `php -S` + mock CRM | Same as T7 for 201, 422, 429 and 404 |
| T9 | Content conformance | Playwright + `brief-copy.json` | Every approved string appears word for word; the 9 section IDs appear in order; 8 solutions and 12 industries match exactly; contact details exact; forbidden terms absent (`MTI PLUS`, `GU CART`, `budget`, `case stud`, `testimonial`, `ISO 27001`, `certified`, tool or vendor names) |
| T10 | Accessibility | `@axe-core/playwright` at 1440 and 390 | 0 violations |
| T11 | Keyboard | Playwright | Skip link, nav, mobile menu (Escape and focus return), accordion, form completion and submit using only the keyboard; focus always visible |
| T12 | Contrast | `scripts/contrast.mjs` | Every pair used in the CSS meets the rules in §3.2 |
| T13 | Screenshots | Playwright | Full page at 1440 and 390, plus each section at both widths, in `docs/screenshots/` |
| T14 | Brief §04 pre-launch checklist | Manual + T1–T13 evidence | Each item recorded as Pass / Pending-owner with evidence in QA-REPORT |

`npm test` runs T4 and T5. `npm run test:e2e` runs T6, T7 and T9–T11. `npm run qa` runs everything and writes `docs/QA-REPORT.md`.

---

## 9. Checkpoints and git

The repo is initialised at the start of C1 with `.gitignore` covering `node_modules/`, `.env`, `.netlify/` and the confidential PDFs (see Q12). Nothing is pushed until the owner supplies the GitHub URL.

| Commit | Contents |
| --- | --- |
| **C1** — structure + brand + hero/challenges/solutions | Folder layout, tokens, fonts, logo/icons, header/nav, sections 01–03, `package.json` |
| **C2** — industries/why/process/technology/FAQ | Sections 04–08, accordion, scroll-spy |
| **C3** — contact form + proxy + SEO + tests + checklist | Section 09 and footer, form, `lead-rules`, proxy core + three adapters, legal placeholders, SEO files, OG image, all tests, Lighthouse, screenshots, README, `.env.example`, QA-REPORT |

---

## 10. Open questions (each with a recommended answer)

Unless the owner says otherwise, I will build with the **Recommended** answer.

**Content: needs MTI sign-off**

**Q1. Solution card descriptions.** The brief gives each category a name and a list of capabilities, but no description, and the card design asks for "a concise description".
**Recommended:** use the one-sentence drafts below. Each one uses only that category's approved capability terms and makes no claims. They will be flagged in QA-REPORT as "pending MTI approval".

| Category | Draft description | Highlights (first three as listed in the brief) |
| --- | --- | --- |
| AI Solutions & Intelligent Automation | Automate repetitive processes, extract data from documents, and support everyday decisions with AI built into your operations. | Business Process Automation · Intelligent Workflow Automation · AI-Powered Operations |
| AI Agents & Virtual Assistants | Custom AI agents and assistants that support your sales, customer support, and internal business teams. | Custom AI Agents · AI Business Assistants · AI Sales Assistants |
| Custom Software Development | Business applications, CRM and ERP systems, and web platforms engineered around the way your organization works. | Custom Business Applications · CRM & ERP Systems · Enterprise Management Platforms |
| Enterprise AI & Knowledge Systems | Private AI systems that search, retrieve, and answer from your organization's own documents and knowledge. | RAG-Based AI Systems · Enterprise Knowledge Bases · Intelligent Document Search |
| Conversational AI & Voice Solutions | Voice agents, chatbots, and WhatsApp automation that handle customer conversations across channels and languages. | AI Voice Agents · WhatsApp AI Automation · Intelligent Chatbots |
| Data Intelligence & Business Analytics | Turn business data into dashboards, reports, and predictive insights that support better decisions. | Business Intelligence Dashboards · Predictive Analytics · Data Integration |
| Digital Transformation & System Integration | Modernize legacy systems, connect enterprise platforms, and move workflows to digital and cloud-based operations. | Digital Transformation Consulting · Legacy System Modernization · Enterprise System Integration |
| Cybersecurity & Information Security | Assess, monitor, and strengthen the security of your systems, data, and AI applications. | Cybersecurity Assessment & Consulting · Security Monitoring & Threat Detection · Vulnerability Assessment |

**Q2. Highlights are capped at 3, so the remaining capabilities don't appear on the cards** (2 per category, 3 for Cybersecurity).
**Recommended:** show the first three, as above. The full lists can return on the later solution pages. The alternative is a "View all capabilities" disclosure on each card, which keeps every approved capability visible but breaks the three-item cap.

**Q3. Cybersecurity governance note** (brief §03: "specific service claims should be validated internally before launch").
**Recommended:** publish the category as approved. QA-REPORT lists the Cybersecurity highlights as a launch item MTI must confirm.

**Q4. Is Company Name required?** The brief lists it as "Text"; the CRM contract and the task make it required.
**Recommended:** required, because the CRM rejects leads without it.

**Q5. Consent wording** is not in the brief.
**Recommended:** "I agree that MTI AI SOLUTIONS may use the information I've provided to respond to my enquiry, as described in the Privacy Policy." Needs MTI legal sign-off.

**Q6. Success, error and booking-note copy** (§5.2 and §4.3) is not in the brief.
**Recommended:** use the drafts in this plan; MTI may adjust the wording.

**Behaviour and design**

**Q7. Where does "Explore Solution" go?** There are no solution pages yet.
**Recommended:** `#contact`, with that service pre-ticked in the form. Point it at the solution page when one exists.

**Q8. Header navigation items.**
**Recommended:** Solutions · Industries · Why MTI · How We Work · Technology · FAQ, plus a "Discuss Your Project" button. Challenges and Contact are reachable by scrolling and through the CTAs.

**Q9. §07 "Explore Our Capabilities"** has the same label as the §03 CTA, which points to §07 itself.
**Recommended:** §03's points to `#technology`; §07's points to `#solutions`.

**Q10. Footer "About Us" and "Our Approach"** have no matching sections.
**Recommended:** About Us → Why MTI (`#why-mti`); Our Approach → How We Work (`#how-we-work`).

**Q11. Country list.**
**Recommended:** the full ISO 3166-1 list with CLDR English short names, alphabetical, no default selection. MTI may review the naming of individual territories.

**Engineering and project**

**Q12. Should the confidential brief and brand PDFs go into git?** Both are marked "CONFIDENTIAL", and the GitHub repo's visibility is not yet known.
**Recommended:** no. Ignore `brief/`, `brand/*.pdf` and the brand-kit preview in git, and commit only the logo files the site uses (copied into `public/assets`). The source folder was renamed from `breif/` to `brief/` (owner decision).

**Q13. CRM payload details to confirm with the CRM team.**
**Recommended assumptions:** (a) leave out empty optional fields rather than sending `""` or `[]`; (b) send `interested_services` and `industry` strings without the "01." numbering; (c) `consent` is always `true`, since the form can't be submitted otherwise.

**Q14. Lead notifications** (brief §03: "Notify the designated sales inbox/team").
**Recommended:** the CRM sends these notifications. The website avoids silent failures by showing every error, giving direct-contact fallbacks, and logging proxy failures at error level. The proxy sends no email of its own (that would need SMTP credentials).

**Q15. Domain and canonical URL.**
**Recommended:** this site replaces the current one at `https://mtiaisolutions.com/`, so the canonical URL is the root with a trailing slash. If it goes live on another host first, the canonical still points to the final domain.

**Q16. Icons.**
**Recommended:** a subset of Lucide line icons (ISC licence, attribution in `public/assets/img/LICENSE-icons.txt`), inlined as one sprite and styled in brand colours. Drawing about 40 bespoke icons is out of proportion for this version.

**Q17. Git author identity.** No global git user is configured on this machine.
**Recommended:** a repo-local config with name "MTI AI SOLUTIONS" and email `mtiai.solutions@gmail.com`.

**Q18. Node version on Netlify and the VPS.**
**Recommended:** Node 20 LTS or later, pinned via `.nvmrc` and `netlify.toml`. It provides native `fetch`, `--env-file` and `AbortSignal.timeout`, so no runtime dependencies are needed.

---

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Hand-drafted card descriptions are read as approved copy | Flagged in QA-REPORT; the content test lists them separately from verbatim brief copy |
| A Lighthouse mobile Performance score below 90 because of fonts | One preloaded variable woff2, `swap`, metric-matched fallback; no CSS framework |
| Netlify functions keep no state, so the server can't rate-limit across invocations | Browser limit, the CRM's own 429 (passed through), and the honeypot. Netlify rate-limit rules can be added on paid plans. |
| The CRM is unreachable at launch | Clear error state with email and WhatsApp fallbacks; error-level logs |
| The brand guide's CRM-only content leaks into the site | The T9 forbidden-terms list includes ISO 27001, the sample client names and CRM figures |

---

*End of plan.*
