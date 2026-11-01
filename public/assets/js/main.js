// Page behaviour: mobile navigation, CTA focus handling and analytics events.
import { track } from './site-config.js';

const header = document.querySelector('.site-header');
const nav = document.getElementById('site-nav');
const toggle = document.querySelector('.nav-toggle');
const mobileNav = window.matchMedia('(max-width: 1099.98px)');

/* ---------- Mobile navigation ---------- */
function setNavOpen(open, { returnFocus = false } = {}) {
  toggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  if (!open && returnFocus) toggle.focus();
}

if (toggle && nav) {
  toggle.addEventListener('click', () => setNavOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a') && mobileNav.matches) setNavOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setNavOpen(false, { returnFocus: true });
  });
  document.addEventListener('click', (e) => {
    if (toggle.getAttribute('aria-expanded') === 'true' && !header.contains(e.target)) setNavOpen(false);
  });
  mobileNav.addEventListener('change', () => setNavOpen(false));
}

/* ---------- Scroll-spy: mark the nav link of the section in view ---------- */
const navLinks = new Map(
  [...document.querySelectorAll('.site-nav a[href^="#"]:not(.btn)')].map((a) => [a.getAttribute('href').slice(1), a]),
);
if ('IntersectionObserver' in window && navLinks.size) {
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      navLinks.forEach((a, id) => {
        if (id === entry.target.id) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main > section[id]').forEach((s) => spy.observe(s));
}

/* ---------- FAQ accordion (WAI-ARIA APG pattern) ---------- */
// The markup ships expanded so answers are readable without JavaScript; collapse on start-up.
document.querySelectorAll('.acc-trigger').forEach((btn) => {
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', () => {
    btn.setAttribute('aria-expanded', String(btn.getAttribute('aria-expanded') !== 'true'));
  });
});

/* ---------- CTA links: move focus to the target after the jump ---------- */
// Links carry data-focus="<selector>"; the browser scrolls to the href, then focus moves for keyboard
// and screen-reader users without a second scroll.
export function focusTarget(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  if (!el.matches('a, button, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-focus]');
  if (link) setTimeout(() => focusTarget(link.dataset.focus), 0);

  const cta = e.target.closest('[data-track="cta"]');
  if (cta) track('cta_click', { label: cta.textContent.trim().replace(/\s+/g, ' '), target: cta.getAttribute('href') || '' });
});
