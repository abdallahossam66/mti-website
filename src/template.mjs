// Page template for every language. Strings come from src/i18n/<lang>.json; everything that must stay
// identical across languages lives here: the company name, the English tagline (brand rule), official
// contact data, digits, the hexagon visual, and the English enum values the CRM expects.
// Build with: npm run build   (scripts/build-site.mjs)
import { readFileSync } from 'node:fs';
import { INDUSTRIES, SERVICES, TIMELINES } from '../public/assets/js/lead-rules.js';

export const SITE = 'https://mtiaisolutions.com';
export const LANGS = [
  { code: 'en', path: '/', label: 'EN', name: 'English' },
  { code: 'de', path: '/de/', label: 'DE', name: 'Deutsch' },
  { code: 'ar', path: '/ar/', label: 'AR', name: 'العربية' },
];
const BRAND = 'MTI AI SOLUTIONS';
const TAGLINE = 'WHERE INDUSTRY MEETS INTELLIGENCE';
const EMAIL = 'info@mtiaisolutions.com';
const PHONE = '+20 105 577 8871';
const PHONE_TEL = '+201055778871';
const WHATSAPP = 'https://wa.me/201055778871';
const LINKEDIN = 'https://www.linkedin.com/company/mti-solutions-g/';
const WEBSITE = 'https://mtiaisolutions.com/';
const EGYPT_ADDRESS = 'Business Square, Delta Flowers Tower, 4 Hafez Ramadan, beside City Centre, Cairo, Egypt.';
const GERMANY_ADDRESS = 'MTI AI SOLUTIONS UG, Friedrichstraße 95, 10117 Berlin, Germany';
const INLINE_JS = "document.documentElement.classList.add('js')";

const SOLUTION_SLUGS = ['ai-automation', 'ai-agents', 'custom-software', 'enterprise-ai', 'conversational-ai', 'data-analytics', 'digital-transformation', 'cybersecurity'];
const INDUSTRY_SLUGS = ['manufacturing', 'healthcare', 'real-estate', 'banking', 'retail', 'education', 'logistics', 'hospitality', 'energy', 'telecommunications', 'professional-services', 'government'];
const ICONS = {
  challenges: ['repeat', 'unplug', 'eye-off', 'trending-up', 'expand', 'message-square-warning'],
  solutions: ['workflow', 'bot', 'code-xml', 'library-big', 'audio-lines', 'chart-pie', 'refresh-cw', 'shield-check'],
  industries: ['factory', 'heart-pulse', 'building-2', 'banknote', 'shopping-cart', 'graduation-cap', 'truck', 'hotel', 'zap', 'radio-tower', 'briefcase', 'landmark'],
  why: ['target', 'puzzle', 'cpu', 'infinity', 'layers', 'shield'],
  technology: ['brain-circuit', 'sparkles', 'bot-message-square', 'audio-waveform', 'app-window', 'cloud', 'database', 'lock-keyhole'],
};
const HERO_NETWORK = readFileSync(new URL('./partials/hero-network.svg.txt', import.meta.url), 'utf8').trim().split('\n');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const icon = (id, cls = 'icon') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="/assets/img/icons.svg#${id}"/></svg>`;
const indent = (html, n) => html.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');
/** Escapes a string, then replaces {token} placeholders with ready-made HTML. */
const fill = (text, tokens) => esc(text).replace(/\{(\w+)\}/g, (m, k) => (k in tokens ? tokens[k] : m));
const newTab = (t) => `<span class="visually-hidden"> ${esc(t.ui.newTab)}</span>`;

/* ---------- Head ---------- */
function head(t, { lang, title, description, robots, canonical, alternates, ogImage }) {
  const lines = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<script>${INLINE_JS}</script>`,
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${attr(description)}">`,
  ];
  if (canonical) lines.push(`<link rel="canonical" href="${canonical}">`);
  if (alternates) {
    for (const l of LANGS) lines.push(`<link rel="alternate" hreflang="${l.code}" href="${SITE}${l.path}">`);
    lines.push(`<link rel="alternate" hreflang="x-default" href="${SITE}/">`);
  }
  lines.push(`<meta name="robots" content="${robots}">`, '<meta name="theme-color" content="#0D1B3E">');
  if (ogImage) {
    lines.push(
      '<meta property="og:type" content="website">',
      `<meta property="og:site_name" content="${BRAND}">`,
      `<meta property="og:title" content="${attr(t.meta.ogTitle)}">`,
      `<meta property="og:description" content="${attr(t.meta.ogDescription)}">`,
      `<meta property="og:url" content="${canonical}">`,
      `<meta property="og:image" content="${SITE}${ogImage}">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      `<meta property="og:image:alt" content="${BRAND} — ${TAGLINE}">`,
      `<meta property="og:locale" content="${t._meta.locale}">`,
      ...LANGS.filter((l) => l.code !== lang).map((l) => `<meta property="og:locale:alternate" content="${LOCALES[l.code]}">`),
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${attr(t.meta.ogTitle)}">`,
      `<meta name="twitter:description" content="${attr(t.meta.ogDescription)}">`,
      `<meta name="twitter:image" content="${SITE}${ogImage}">`,
      `<meta name="twitter:image:alt" content="${BRAND} — ${TAGLINE}">`,
    );
  }
  lines.push(
    '<link rel="icon" href="/assets/icons/favicon.ico" sizes="48x48">',
    '<link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="/assets/icons/app-icon-180.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    '<link rel="preload" href="/assets/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>',
  );
  if (lang === 'ar') lines.push('<link rel="preload" href="/assets/fonts/cairo-arabic-var.woff2" as="font" type="font/woff2" crossorigin>');
  lines.push('<link rel="stylesheet" href="/assets/css/main.css">', '<script type="module" src="/assets/js/main.js"></script>');
  return lines;
}
const LOCALES = { en: 'en_US', de: 'de_DE', ar: 'ar_AR' };

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND,
  slogan: TAGLINE,
  url: WEBSITE,
  logo: `${SITE}/assets/icons/app-icon-512.png`,
  email: EMAIL,
  telephone: PHONE,
  address: { '@type': 'PostalAddress', streetAddress: 'Business Square, Delta Flowers Tower, 4 Hafez Ramadan, beside City Centre', addressLocality: 'Cairo', addressCountry: 'EG' },
  location: [
    { '@type': 'Place', name: 'Egypt office', address: { '@type': 'PostalAddress', streetAddress: 'Business Square, Delta Flowers Tower, 4 Hafez Ramadan, beside City Centre', addressLocality: 'Cairo', addressCountry: 'EG' } },
    { '@type': 'Place', name: 'Germany office', address: { '@type': 'PostalAddress', name: 'MTI AI SOLUTIONS UG', streetAddress: 'Friedrichstraße 95', postalCode: '10117', addressLocality: 'Berlin', addressCountry: 'DE' } },
  ],
  sameAs: [LINKEDIN],
};

/* ---------- Header and footer (shared by every page) ---------- */
function header(t, lang, base) {
  const nav = ['solutions', 'industries', 'why-mti', 'how-we-work', 'technology', 'faq'];
  const focus = base ? '' : ' data-focus="#contact-title"';
  const langs = LANGS.map((l) => {
    const current = l.code === lang ? ' aria-current="page"' : '';
    return `<li><a href="${l.path}" hreflang="${l.code}" lang="${l.code}"${current}>${l.label}<span class="visually-hidden"> – ${esc(l.name)}</span></a></li>`;
  });
  return `<header class="site-header on-dark">
  <div class="container header-inner">
    <a class="brand-link" href="${base ? LANGS.find((l) => l.code === lang).path : '#home'}">
      <img src="/assets/img/logo-reversed.svg" width="150" height="53" alt="${attr(t.ui.homeAlt)}">
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      ${icon('menu', 'icon icon-open')}
      ${icon('x', 'icon icon-close')}
      <span>${esc(t.ui.menu)}</span>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="${attr(t.ui.navLabel)}">
      <ul class="nav-links">
${nav.map((id, i) => `        <li><a href="${base}#${id}">${esc(t.ui.nav[i])}</a></li>`).join('\n')}
        <li class="nav-cta"><a class="btn btn-primary" href="${base}#contact" data-track="cta"${focus}>${esc(t.hero.ctaPrimary)}</a></li>
      </ul>
      <ul class="lang-switch" aria-label="${attr(t.ui.languageLabel)}">
${langs.map((l) => `        ${l}`).join('\n')}
      </ul>
    </nav>
  </div>
</header>`;
}

function offices(t, cls) {
  return `<div class="${cls}">
  <div class="office">
    <span class="detail-label">${esc(t.contact.egyptOffice)}</span>
    <address><bdi>${esc(EGYPT_ADDRESS)}</bdi></address>
  </div>
  <div class="office">
    <span class="detail-label">${esc(t.contact.germanyOffice)}</span>
    <address><bdi>${esc(GERMANY_ADDRESS)}</bdi></address>
  </div>
</div>`;
}

function footer(t, base) {
  const f = t.footer;
  return `<footer class="site-footer on-dark">
  <div class="container footer-grid">
    <div class="footer-brand">
      <img src="/assets/img/logo-reversed.svg" width="160" height="57" alt="${BRAND}" loading="lazy">
      <p class="footer-tagline" lang="en">${TAGLINE}</p>
      <p class="footer-line">${esc(f.brandLine)}</p>
      <h2 class="footer-title footer-offices-title">${esc(f.offices)}</h2>
${indent(offices(t, 'footer-offices'), 6)}
    </div>
    <nav class="footer-col" aria-labelledby="ft-company">
      <h2 class="footer-title" id="ft-company">${esc(f.company)}</h2>
      <ul>
        <li><a href="${base}#why-mti">${esc(f.about)}</a></li>
        <li><a href="${base}#how-we-work">${esc(f.approach)}</a></li>
        <li><a href="${base}#contact">${esc(f.contactUs)}</a></li>
      </ul>
    </nav>
    <nav class="footer-col" aria-labelledby="ft-solutions">
      <h2 class="footer-title" id="ft-solutions">${esc(f.solutions)}</h2>
      <ul>
${t.solutions.categories.map((s, i) => `        <li><a href="${base}#solution-${SOLUTION_SLUGS[i]}">${esc(s.name)}</a></li>`).join('\n')}
      </ul>
    </nav>
    <nav class="footer-col" aria-labelledby="ft-industries">
      <h2 class="footer-title" id="ft-industries">${esc(f.industries)}</h2>
      <ul class="footer-industries">
${t.industries.cards.map(([name], i) => `        <li><a href="${base}#industry-${INDUSTRY_SLUGS[i]}">${esc(name)}</a></li>`).join('\n')}
      </ul>
    </nav>
    <div class="footer-side">
      <nav class="footer-col" aria-labelledby="ft-connect">
        <h2 class="footer-title" id="ft-connect">${esc(f.connect)}</h2>
        <ul>
          <li><a href="${LINKEDIN}" target="_blank" rel="noopener">${esc(f.linkedin)}${newTab(t)}</a></li>
          <li><a href="mailto:${EMAIL}">${esc(f.email)}</a></li>
          <li><a href="${WHATSAPP}" target="_blank" rel="noopener">${esc(f.whatsapp)}${newTab(t)}</a></li>
        </ul>
      </nav>
      <nav class="footer-col" aria-labelledby="ft-legal">
        <h2 class="footer-title" id="ft-legal">${esc(f.legal)}</h2>
        <ul>
          <li><a href="/privacy.html">${esc(f.privacy)}</a></li>
          <li><a href="/terms.html">${esc(f.terms)}</a></li>
          <li><a href="/cookies.html">${esc(f.cookies)}</a></li>
        </ul>
      </nav>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="container">
      <p>${esc(f.copyright)}</p>
    </div>
  </div>
</footer>`;
}

/* ---------- Sections ---------- */
const sectionHead = (id, eyebrow, title, text) => `<div class="section-head center">
  <p class="eyebrow">${esc(eyebrow)}</p>
  <h2 class="section-title" id="${id}-title">${esc(title)}</h2>
  <p class="section-lead">${esc(text)}</p>
</div>`;
const close = (text, cta) => `<div class="section-close">
  <p class="closing-statement">${esc(text)}</p>${cta ? `\n  ${cta}` : ''}
</div>`;
const button = (label, href, cls, focus) => `<a class="btn ${cls}" href="${href}" data-track="cta"${focus ? ` data-focus="${focus}"` : ''}>${esc(label)}
    ${icon('arrow-right', 'icon icon-arrow')}</a>`;

function hero(t) {
  return `<!-- §01 HERO -->
<section class="hero section-dark on-dark" id="home" aria-labelledby="hero-title">
  <div class="container hero-grid">
    <div class="hero-copy">
      <p class="brand-signature" lang="en">
        <span class="sig-name">${BRAND}</span>
        <span class="sig-tagline">${TAGLINE}</span>
      </p>
      <h1 id="hero-title">${esc(t.hero.headline)}</h1>
      <p class="hero-lead">${esc(t.hero.text)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#contact" data-track="cta" data-focus="#contact-title">${esc(t.hero.ctaPrimary)}
          ${icon('arrow-right', 'icon icon-arrow')}</a>
        <a class="btn btn-outline-dark" href="#solutions" data-track="cta">${esc(t.hero.ctaSecondary)}</a>
      </div>
    </div>
    <div class="hero-visual">
      <svg viewBox="0 0 520 480" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hv-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#C8922A"/>
            <stop offset="0.55" stop-color="#1E6FD9"/>
            <stop offset="1" stop-color="#00C8FF"/>
          </linearGradient>
        </defs>
${HERO_NETWORK.map((l) => `        ${l}`).join('\n')}
      </svg>
    </div>
  </div>
</section>`;
}

function challenges(t) {
  const x = t.challenges;
  return `<!-- §02 THE BUSINESS CHALLENGES -->
<section class="section section-light" id="challenges" aria-labelledby="challenges-title">
  <div class="container">
${indent(sectionHead('challenges', x.eyebrow, x.headline, x.text), 4)}
    <ul class="card-grid cols-3">
${x.cards.map(([name, desc], i) => `      <li class="card challenge-card">
        <div class="icon-tile">${icon(ICONS.challenges[i])}</div>
        <h3>${esc(name)}</h3>
        <p>${esc(desc)}</p>
      </li>`).join('\n')}
    </ul>
${indent(close(x.closing), 4)}
  </div>
</section>`;
}

function solutions(t) {
  const x = t.solutions;
  return `<!-- §03 OUR SOLUTIONS -->
<section class="section section-white" id="solutions" aria-labelledby="solutions-title">
  <div class="container">
${indent(sectionHead('solutions', x.eyebrow, x.headline, x.text), 4)}
    <ul class="card-grid cols-4 solutions-grid">
${x.categories.map((s, i) => `      <li class="card solution-card" id="solution-${SOLUTION_SLUGS[i]}">
        <div class="solution-top">
          <div class="icon-tile">${icon(ICONS.solutions[i])}</div>
          <span class="solution-num" aria-hidden="true">${pad(i + 1)}</span>
        </div>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.description)}</p>
        <ul class="highlights" aria-label="${attr(x.highlightsLabel)}">
${s.highlights.map((h) => `          <li>${icon('check')}<span>${esc(h)}</span></li>`).join('\n')}
        </ul>
        <a class="card-link" href="#contact" data-service="${attr(SERVICES[i])}" data-track="cta" data-focus="#contact-title">${esc(x.explore)}<span class="visually-hidden">: ${esc(s.name)}</span>${icon('arrow-right')}</a>
      </li>`).join('\n')}
    </ul>
${indent(close(x.closing, button(x.cta, '#technology', 'btn-outline-light')), 4)}
  </div>
</section>`;
}

function industries(t) {
  const x = t.industries;
  return `<!-- §04 INDUSTRIES WE SERVE -->
<section class="section section-light" id="industries" aria-labelledby="industries-title">
  <div class="container">
${indent(sectionHead('industries', x.eyebrow, x.headline, x.text), 4)}
    <ul class="card-grid cols-4 industries-grid">
${x.cards.map(([name, a, b], i) => `      <li class="card industry-card" id="industry-${INDUSTRY_SLUGS[i]}">
        <div class="icon-tile icon-tile-navy">${icon(ICONS.industries[i])}</div>
        <h3>${esc(name)}</h3>
        <ul class="focus-tags" aria-label="${attr(x.focusLabel)}">
          <li>${esc(a)}</li>
          <li>${esc(b)}</li>
        </ul>
      </li>`).join('\n')}
    </ul>
${indent(close(x.closing, button(x.cta, '#solutions', 'btn-outline-light')), 4)}
  </div>
</section>`;
}

function why(t) {
  const x = t.why;
  return `<!-- §05 WHY MTI AI SOLUTIONS? -->
<section class="section section-white" id="why-mti" aria-labelledby="why-mti-title">
  <div class="container">
${indent(sectionHead('why-mti', x.eyebrow, x.headline, x.text), 4)}
    <ul class="card-grid cols-3">
${x.cards.map(([name, desc], i) => `      <li class="card advantage-card">
        <div class="icon-tile">${icon(ICONS.why[i])}</div>
        <h3>${esc(name)}</h3>
        <p>${esc(desc)}</p>
      </li>`).join('\n')}
    </ul>
    <div class="philosophy on-dark">
      <div class="philosophy-head">
        <p class="eyebrow">${esc(x.philosophyLabel)}</p>
        <h3 class="philosophy-title">${esc(x.philosophyTitle)}</h3>
      </div>
      <ol class="philosophy-steps">
${x.philosophy.map(([name, desc], i) => `        <li>
          <span class="step-num" aria-hidden="true">${pad(i + 1)}</span>
          <span class="step-name">${esc(name)}</span>
          <span class="step-desc">${esc(desc)}</span>
        </li>`).join('\n')}
      </ol>
    </div>
${indent(close(x.closing, button(x.cta, '#contact', 'btn-primary', '#contact-title')), 4)}
  </div>
</section>`;
}

function process(t) {
  const x = t.process;
  return `<!-- §06 HOW WE WORK -->
<section class="section section-light" id="how-we-work" aria-labelledby="how-we-work-title">
  <div class="container">
${indent(sectionHead('how-we-work', x.eyebrow, x.headline, x.text), 4)}
    <ol class="journey" aria-label="${attr(x.journeyLabel)}">
${x.journey.map((label) => `      <li>${esc(label)}</li>`).join('\n')}
    </ol>
    <ol class="timeline">
${x.stages.map(([title, desc], i) => `      <li class="stage">
        <div class="stage-marker"><span class="stage-num"><span class="visually-hidden">${esc(x.stagePrefix)} </span>${pad(i + 1)}</span></div>
        <div class="stage-body">
          <h3>${esc(title)}</h3>
          <p>${esc(desc)}</p>
        </div>
      </li>`).join('\n')}
    </ol>
${indent(close(x.closing, button(x.cta, '#contact', 'btn-primary', '#contact-title')), 4)}
  </div>
</section>`;
}

function technology(t) {
  const x = t.technology;
  return `<!-- §07 TECHNOLOGY & INNOVATION -->
<section class="section section-dark on-dark technology" id="technology" aria-labelledby="technology-title">
  <svg class="tech-motif" viewBox="0 0 200 230" aria-hidden="true" focusable="false"><polygon points="100,5 195,60 195,170 100,225 5,170 5,60"/><polygon points="100,45 160,80 160,150 100,185 40,150 40,80"/></svg>
  <div class="container">
${indent(sectionHead('technology', x.eyebrow, x.headline, x.text), 4)}
    <ul class="card-grid cols-4">
${x.cards.map((c, i) => `      <li class="tech-card">
        <div class="tech-top">
          <div class="tech-icon">${icon(ICONS.technology[i])}</div>
          <span class="tech-num" aria-hidden="true">${pad(i + 1)}</span>
        </div>
        <h3>${esc(c.name)}</h3>
        <ul class="tech-items">
${c.items.map((it) => `          <li>${esc(it)}</li>`).join('\n')}
        </ul>
      </li>`).join('\n')}
    </ul>
${indent(close(x.closing, button(x.cta, '#solutions', 'btn-outline-dark')), 4)}
  </div>
</section>`;
}

function faq(t) {
  const x = t.faq;
  return `<!-- §08 FREQUENTLY ASKED QUESTIONS -->
<section class="section section-white" id="faq" aria-labelledby="faq-title">
  <div class="container narrow">
${indent(sectionHead('faq', x.eyebrow, x.headline, x.text), 4)}
    <div class="accordion">
${x.items.map(([q, a], i) => `      <div class="acc-item">
        <h3 class="acc-heading">
          <button class="acc-trigger" type="button" id="faq-q${i + 1}" aria-expanded="true" aria-controls="faq-a${i + 1}">
            <span>${esc(q)}</span><span class="acc-icon" aria-hidden="true"></span>
          </button>
        </h3>
        <div class="acc-panel" id="faq-a${i + 1}" role="region" aria-labelledby="faq-q${i + 1}">
          <div class="acc-inner"><p>${esc(a)}</p></div>
        </div>
      </div>`).join('\n')}
    </div>
  </div>
</section>`;
}

function field(key, id, label, control, { required = false } = {}) {
  const req = required ? ' <span class="req" aria-hidden="true">*</span>' : '';
  return `<div class="field" data-field="${key}">
  <label for="${id}">${esc(label)}${req}</label>
  ${control}
  <p class="field-error" id="${id}-error" hidden></p>
</div>`;
}

function contact(t) {
  const c = t.contact;
  const f = t.form;
  const option = (value, label) => (value === label ? `<option>${esc(value)}</option>` : `<option value="${attr(value)}">${esc(label)}</option>`);
  return `<!-- §09 CONTACT & FINAL CALL TO ACTION -->
<section class="section section-dark on-dark contact" id="contact" aria-labelledby="contact-title">
  <div class="container contact-grid">
    <div class="contact-intro">
      <p class="eyebrow">${esc(c.eyebrow)}</p>
      <h2 class="section-title" id="contact-title">${esc(c.headline)}</h2>
      <p class="section-lead">${esc(c.text)}</p>
      <div class="contact-actions">
        <a class="btn btn-primary" href="#contact-form" data-track="cta" data-focus="#f-name">${esc(c.ctaPrimary)}
          ${icon('arrow-right', 'icon icon-arrow')}</a>
        <button class="btn btn-outline-dark" type="button" id="book-consultation" data-track="cta">
          ${icon('calendar')}${esc(c.ctaBook)}</button>
      </div>

      <h3 class="contact-details-title">${esc(c.detailsTitle)}</h3>
      <ul class="contact-details">
        <li>
          ${icon('mail')}
          <div><span class="detail-label">${esc(c.emailLabel)}</span><a href="mailto:${EMAIL}"><bdi>${EMAIL}</bdi></a></div>
        </li>
        <li>
          ${icon('phone')}
          <div><span class="detail-label">${esc(c.phoneLabel)}</span><a href="tel:${PHONE_TEL}"><bdi>${PHONE}</bdi></a> <span aria-hidden="true">·</span> <a href="${WHATSAPP}" target="_blank" rel="noopener">${esc(c.whatsapp)}${newTab(t)}</a></div>
        </li>
        <li class="contact-offices">
          ${icon('map-pin')}
${indent(offices(t, 'offices'), 10)}
        </li>
        <li>
          ${icon('globe')}
          <div><span class="detail-label">${esc(c.websiteLabel)}</span><a href="${WEBSITE}"><bdi>mtiaisolutions.com</bdi></a></div>
        </li>
        <li>
          ${icon('linkedin')}
          <div><span class="detail-label">${esc(c.linkedinLabel)}</span><a href="${LINKEDIN}" target="_blank" rel="noopener">${esc(c.linkedinText)}${newTab(t)}</a></div>
        </li>
      </ul>
    </div>

    <div class="form-card" id="contact-form">
      <h3 class="form-title" id="form-title">${esc(f.title)}</h3>
      <p class="form-intro">${fill(f.intro, { req: '<span class="req">*</span>' })}</p>
      <p class="booking-note" id="booking-note" tabindex="-1" hidden>
        ${icon('info', 'icon icon-sm')}
        <span>${esc(c.bookingNote)}</span>
      </p>

      <div class="error-summary" id="error-summary" tabindex="-1" hidden>
        <h4>
          ${icon('circle-alert', 'icon icon-sm')}
          ${esc(f.summaryTitle)}</h4>
        <ul></ul>
      </div>
      <div class="form-alert" id="form-alert" role="alert"></div>

      <form id="lead-form" class="lead-form" novalidate aria-labelledby="form-title">
        <div class="hp-field" aria-hidden="true">
          <label for="f-website">${esc(f.honeypotLabel)}</label>
          <input id="f-website" name="company_website" type="text" tabindex="-1" autocomplete="off">
        </div>

        <div class="form-grid">
${indent(field('name', 'f-name', f.name, '<input id="f-name" name="name" type="text" autocomplete="name" required maxlength="120">', { required: true }), 10)}
${indent(field('business_email', 'f-email', f.email, '<input id="f-email" name="business_email" type="email" autocomplete="email" inputmode="email" required maxlength="190" spellcheck="false" dir="ltr">', { required: true }), 10)}
${indent(field('company', 'f-company', f.company, '<input id="f-company" name="company" type="text" autocomplete="organization" required maxlength="160">', { required: true }), 10)}
${indent(field('phone', 'f-phone', f.phone, '<input id="f-phone" name="phone" type="tel" autocomplete="tel" maxlength="40" dir="ltr">'), 10)}
${indent(field('country', 'f-country', f.country, `<select id="f-country" name="country" autocomplete="country">
    <option value="">${esc(f.countryPlaceholder)}</option>
  </select>`), 10)}
${indent(field('industry', 'f-industry', f.industry, `<select id="f-industry" name="industry">
    <option value="">${esc(f.industryPlaceholder)}</option>
${INDUSTRIES.map((value, i) => `    ${option(value, t.industries.cards[i][0])}`).join('\n')}
  </select>`), 10)}
        </div>

        <fieldset class="field field-group" id="f-services" data-field="interested_services">
          <legend>${esc(f.services)} <span class="hint">${esc(f.servicesHint)}</span></legend>
          <div class="check-grid">
${SERVICES.map((value, i) => `            <label class="check"><input type="checkbox" name="interested_services" value="${attr(value)}"><span>${esc(t.solutions.categories[i].name)}</span></label>`).join('\n')}
          </div>
          <p class="field-error" id="f-services-error" hidden></p>
        </fieldset>

${indent(field('timeline', 'f-timeline', f.timeline, `<select id="f-timeline" name="timeline">
    <option value="">${esc(f.timelinePlaceholder)}</option>
${TIMELINES.map((value, i) => `    ${option(value, f.timelines[i])}`).join('\n')}
  </select>`), 8)}

        <div class="field" data-field="message">
          <label for="f-message">${esc(f.message)}</label>
          <textarea id="f-message" name="message" rows="5" maxlength="4000" aria-describedby="f-message-count"></textarea>
          <p class="char-count" id="f-message-count">${fill(f.charCount, { count: '<span>0</span>' })}</p>
          <p class="field-error" id="f-message-error" hidden></p>
        </div>

        <div class="field field-consent" data-field="consent">
          <label class="check">
            <input type="checkbox" id="f-consent" name="consent" required>
            <span>${fill(f.consent, { privacy: `<a href="/privacy.html">${esc(f.privacyLink)}</a>` })} <span class="req" aria-hidden="true">*</span></span>
          </label>
          <p class="field-error" id="f-consent-error" hidden></p>
        </div>

        <button class="btn btn-primary btn-submit" type="submit">
          <span class="btn-label">${esc(f.submit)}</span>
          ${icon('arrow-right', 'icon icon-arrow')}
        </button>
        <p class="form-hint" id="form-hint" aria-live="polite"></p>
        <noscript><p class="form-hint">${fill(f.noscript, { email: `<a href="mailto:${EMAIL}"><bdi>${EMAIL}</bdi></a>`, phone: `<bdi>${PHONE}</bdi>` })}</p></noscript>
      </form>

      <div class="form-success" id="form-success" tabindex="-1" hidden>
        ${icon('circle-check')}
        <h4>${esc(f.successTitle)}</h4>
        <p class="success-ref" hidden>${fill(f.successRef, { ref: '<strong id="success-ref" dir="ltr"></strong>' })}</p>
        <p>${esc(f.successNext)}</p>
      </div>
    </div>
  </div>
</section>`;
}

const jsonScript = (id, data) => `<script type="${id === 'ld' ? 'application/ld+json' : 'application/json'}"${id === 'ld' ? '' : ` id="${id}"`}>${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}</script>`;

/* ---------- Pages ---------- */
export function renderHome(t) {
  const lang = t._meta.lang;
  const path = LANGS.find((l) => l.code === lang).path;
  const sections = [hero, challenges, solutions, industries, why, process, technology, faq, contact].map((s) => indent(s(t), 4)).join('\n\n');
  const headLines = head(t, {
    lang, title: t.meta.title, description: t.meta.description, robots: 'index, follow',
    canonical: `${SITE}${path}`, alternates: true, ogImage: `/assets/img/og-image${lang === 'en' ? '' : `-${lang}`}.png`,
  });
  headLines.push('<script type="module" src="/assets/js/form.js"></script>', ...jsonScript('ld', JSON_LD).split('\n'),
    ...jsonScript('i18n', { lang, messages: t.messages }).split('\n'));
  return `<!doctype html>
<html lang="${lang}" dir="${t._meta.dir}">
<head>
${headLines.map((l) => `  ${l}`).join('\n')}
</head>
<body>
  <!-- Generated by scripts/build-site.mjs from src/template.mjs and src/i18n/${lang}.json. Do not edit by hand. -->
  <a class="skip-link" href="#main">${esc(t.ui.skip)}</a>

${indent(header(t, lang, ''), 2)}

  <main id="main">
${sections}
  </main>

${indent(footer(t, ''), 2)}
</body>
</html>
`;
}

/** English-only pages (legal placeholders, 404) with the shared header and footer. */
export function renderPlain(t, { title, description, body }) {
  const headLines = head(t, { lang: 'en', title: `${title} — ${BRAND}`, description, robots: 'noindex, follow' });
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
${headLines.map((l) => `  ${l}`).join('\n')}
</head>
<body>
  <!-- Generated by scripts/build-site.mjs. Do not edit by hand. -->
  <a class="skip-link" href="#main">${esc(t.ui.skip)}</a>

${indent(header(t, 'en', '/'), 2)}

  <main id="main" class="page-plain">
    <div class="container narrow">
${indent(body, 6)}
    </div>
  </main>

${indent(footer(t, '/'), 2)}
</body>
</html>
`;
}

export { esc, EMAIL };
