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
