// Contact form: client-side validation, payload, submit, success/error states, browser rate limit.
// Server-side validation happens again in the /api/contact proxy (same rules) and in the CRM.
// Labels and messages follow the page language (strings in the #i18n data block); the values sent to the
// CRM are always the exact English enum strings from lead-rules.js.
import { COUNTRIES } from './countries.js';
import { HONEYPOT, MESSAGES_EN, sanitizeLead, validateLead } from './lead-rules.js';
import { track } from './site-config.js';

const ENDPOINT = '/api/contact';
const MIN_INTERVAL_MS = 10_000; // between two requests from this tab
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const STORAGE_KEY = 'mti-contact-attempts';
const CONTACT_FALLBACK = { email: 'info@mtiaisolutions.com', whatsapp: 'https://wa.me/201055778871', phone: '+20 105 577 8871' };

const I18N = readI18n();
const LANG = I18N.lang;
const M = I18N.messages;
const plural = (forms, n) => (forms[new Intl.PluralRules(LANG).select(n)] ?? forms.other).replace('{n}', String(n));

const form = document.getElementById('lead-form');
if (form) initForm(form);

function initForm(form) {
  const card = document.getElementById('contact-form');
  const summary = document.getElementById('error-summary');
  const alertBox = document.getElementById('form-alert');
  const hint = document.getElementById('form-hint');
  const success = document.getElementById('form-success');
  const submit = form.querySelector('.btn-submit');
  const submitLabel = submit.querySelector('.btn-label');
  const field = (key) => form.querySelector(`[data-field="${key}"]`);
  const control = (name) => form.elements.namedItem(name);

  // Countries come from the bundled ISO 3166-1 list (value = alpha-2 code); names follow the page language.
  const country = control('country');
  const regionNames = LANG === 'en' ? null : new Intl.DisplayNames([LANG], { type: 'region' });
  const countries = COUNTRIES.map(([code, label]) => [code, regionNames?.of(code) || label]);
  if (regionNames) countries.sort((a, b) => a[1].localeCompare(b[1], LANG));
  country.append(...countries.map(([code, label]) => new Option(label, code)));

  // Live character count for the message.
  const message = control('message');
  const count = document.querySelector('#f-message-count span');
  message.addEventListener('input', () => { count.textContent = String(message.value.length); });

  let inFlight = false;
  const touched = new Set();

  function collect() {
    const params = new URLSearchParams(location.search);
    return {
      name: control('name').value,
      business_email: control('business_email').value,
      company: control('company').value,
      phone: control('phone').value,
      country: country.value,
      industry: control('industry').value,
      interested_services: [...form.querySelectorAll('input[name="interested_services"]:checked')].map((i) => i.value),
      timeline: control('timeline').value,
      message: message.value,
      consent: control('consent').checked,
      page_url: location.href,
      referrer: document.referrer,
      utm: { source: params.get('utm_source') || '', medium: params.get('utm_medium') || '', campaign: params.get('utm_campaign') || '' },
    };
  }

  /* ---------- Field error display ---------- */
  function setFieldError(key, text) {
    const wrapper = field(key);
    if (!wrapper) return false;
    const error = wrapper.querySelector('.field-error');
    const inputs = wrapper.matches('fieldset') ? [] : wrapper.querySelectorAll('input, select, textarea');
    wrapper.classList.toggle('has-error', Boolean(text));
    if (text) {
      error.replaceChildren(icon('circle-alert'), document.createTextNode(text));
      error.hidden = false;
    } else {
      error.replaceChildren();
      error.hidden = true;
    }
    for (const input of inputs) {
      const describedBy = new Set((input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
      if (text) { input.setAttribute('aria-invalid', 'true'); describedBy.add(error.id); } else { input.removeAttribute('aria-invalid'); describedBy.delete(error.id); }
      if (describedBy.size) input.setAttribute('aria-describedby', [...describedBy].join(' ')); else input.removeAttribute('aria-describedby');
    }
    if (wrapper.matches('fieldset')) {
      if (text) wrapper.setAttribute('aria-describedby', error.id); else wrapper.removeAttribute('aria-describedby');
    }
    return true;
  }

  function firstFocusable(key) {
    return field(key)?.querySelector('input:not([type=hidden]), select, textarea');
  }

  function showErrors(errors, generalMessage) {
    const keys = ['name', 'business_email', 'company', 'phone', 'country', 'industry', 'interested_services', 'timeline', 'message', 'consent'];
    const list = summary.querySelector('ul');
    list.replaceChildren();
    const unknown = [];
    for (const key of keys) setFieldError(key, '');
    for (const [key, messages] of Object.entries(errors)) {
      const text = Array.isArray(messages) ? messages[0] : String(messages);
      if (setFieldError(key, text)) {
        const target = firstFocusable(key);
        const link = document.createElement('a');
        link.href = `#${target.id || field(key).id || 'contact-form'}`;
        link.textContent = text;
        link.addEventListener('click', (e) => { e.preventDefault(); target.focus(); });
        const li = document.createElement('li');
        li.append(link);
        list.append(li);
      } else {
        unknown.push(text);
      }
    }
    if (unknown.length || (generalMessage && !list.children.length)) {
      const li = document.createElement('li');
      li.textContent = unknown[0] || generalMessage;
      list.append(li);
    }
    summary.hidden = !list.children.length;
    if (!summary.hidden) summary.focus();
  }

  function clearErrors() {
    summary.hidden = true;
    summary.querySelector('ul').replaceChildren();
    form.querySelectorAll('[data-field]').forEach((w) => setFieldError(w.dataset.field, ''));
  }

  /* ---------- Validation as the user goes ---------- */
  function revalidate(key) {
    const errors = validateLead(sanitizeLead(collect()), M.fields);
    setFieldError(key, errors[key]?.[0] || '');
  }
  form.addEventListener('focusout', (e) => {
    const key = e.target.closest('[data-field]')?.dataset.field;
    if (!key || key === 'interested_services') return;
    if (e.target.value || e.target.checked || touched.has(key)) { touched.add(key); revalidate(key); }
  });
  form.addEventListener('input', (e) => {
    const wrapper = e.target.closest('[data-field]');
    if (wrapper?.classList.contains('has-error')) revalidate(wrapper.dataset.field);
  });
  form.addEventListener('change', (e) => {
    const wrapper = e.target.closest('[data-field]');
    if (wrapper?.classList.contains('has-error')) revalidate(wrapper.dataset.field);
  });

  /* ---------- Alerts ---------- */
  function showAlert(kind) {
    const p = document.createElement('p');
    p.append(icon('circle-alert'));
    if (kind === 'rate') {
      p.append(M.rateLimited);
    } else {
      const links = {
        email: linkTo(`mailto:${CONTACT_FALLBACK.email}`, CONTACT_FALLBACK.email),
        whatsapp: linkTo(CONTACT_FALLBACK.whatsapp, CONTACT_FALLBACK.phone, true),
      };
      // Split the translated sentence on {email} / {whatsapp} and put the links in place.
      for (const part of M.generic.split(/(\{email\}|\{whatsapp\})/)) {
        p.append(part === '{email}' ? links.email : part === '{whatsapp}' ? links.whatsapp : part);
      }
    }
    alertBox.replaceChildren(p);
    alertBox.classList.add('is-visible');
  }
  function clearAlert() { alertBox.replaceChildren(); alertBox.classList.remove('is-visible'); hint.textContent = ''; }

  /* ---------- Browser rate limit ---------- */
  let memoryAttempts = [];
  function attempts() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]').filter((t) => Date.now() - t < WINDOW_MS); } catch { return memoryAttempts; }
  }
  function recordAttempt() {
    const list = [...attempts(), Date.now()];
    memoryAttempts = list;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* storage unavailable: memory only */ }
  }
  function rateLimitMessage() {
    const list = attempts();
    const now = Date.now();
    if (list.length >= MAX_PER_WINDOW) {
      const minutes = Math.ceil((WINDOW_MS - (now - list[0])) / 60_000);
      return plural(M.tryMinutes, minutes);
    }
    const last = list.at(-1);
    if (last && now - last < MIN_INTERVAL_MS) {
      const seconds = Math.ceil((MIN_INTERVAL_MS - (now - last)) / 1000);
      return plural(M.waitSeconds, seconds);
    }
    return '';
  }

  function setBusy(busy) {
    inFlight = busy;
    submit.disabled = busy;
    form.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? M.sending : M.submit;
  }

  function showSuccess(reference) {
    const refLine = success.querySelector('.success-ref');
    document.getElementById('success-ref').textContent = reference || '';
    refLine.hidden = !reference;
    form.hidden = true;
    summary.hidden = true;
    clearAlert();
    document.getElementById('booking-note')?.setAttribute('hidden', '');
    success.hidden = false;
    card.classList.add('is-success');
    success.focus();
    form.reset();
    count.textContent = '0';
  }

  /* ---------- Submit ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (inFlight) return;
    clearAlert();

    const lead = sanitizeLead(collect());
    const errors = validateLead(lead, M.fields);
    if (Object.keys(errors).length) {
      Object.keys(errors).forEach((k) => touched.add(k));
      showErrors(errors);
      track('form_validation_error', { fields: Object.keys(errors) });
      return;
    }
    clearErrors();

    // Spam trap: bots that fill the hidden field see a normal confirmation; nothing is sent.
    if (control(HONEYPOT).value.trim()) { showSuccess(''); return; }

    const limited = rateLimitMessage();
    if (limited) { hint.textContent = limited; return; }

    setBusy(true);
    recordAttempt();
    let res;
    let data = {};
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(20_000),
      });
      data = await res.json().catch(() => ({}));
    } catch {
      res = null;
    } finally {
      setBusy(false);
    }

    const status = res ? res.status : 0;
    if (status === 201) {
      showSuccess(typeof data.reference === 'string' ? data.reference : '');
      track('form_submit_success', { services: lead.interested_services || [], industry: lead.industry || '' });
      return;
    }
    track('form_submit_error', { status });
    if (status === 422) {
      // CRM and proxy messages are English; other languages show the localized message for each field.
      const serverErrors = data.errors && typeof data.errors === 'object' ? data.errors : {};
      const errorsToShow = LANG === 'en' ? serverErrors
        : Object.fromEntries(Object.keys(serverErrors).map((k) => [k, [M.fields[k]?.invalid || M.checkFields]]));
      showErrors(errorsToShow, LANG === 'en' && data.message ? data.message : M.checkFields);
    }
    else if (status === 429) showAlert('rate');
    else showAlert('generic');
  });
}

function icon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon icon-sm');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `/assets/img/icons.svg#${id}`);
  svg.append(use);
  return svg;
}

function linkTo(href, text, newTab = false) {
  const a = document.createElement('a');
  a.href = href;
  a.append(Object.assign(document.createElement('bdi'), { textContent: text }));
  if (newTab) {
    a.target = '_blank';
    a.rel = 'noopener';
    a.append(Object.assign(document.createElement('span'), { className: 'visually-hidden', textContent: ` ${M.newTab}` }));
  }
  return a;
}

/** Page strings from <script type="application/json" id="i18n">; English fallback if absent. */
function readI18n() {
  try {
    const data = JSON.parse(document.getElementById('i18n').textContent);
    if (data?.messages?.fields) return data;
  } catch { /* fall through */ }
  return {
    lang: 'en',
    messages: {
      fields: MESSAGES_EN,
      checkFields: 'Please check the highlighted fields.',
      rateLimited: "We've received several requests from your connection. Please try again in a few minutes.",
      generic: "We couldn't send your message right now. Please try again, or contact us directly at {email} or on WhatsApp {whatsapp}.",
      waitSeconds: { one: 'Please wait {n} second before sending again.', other: 'Please wait {n} seconds before sending again.' },
      tryMinutes: { one: "You've sent several requests in a short time. Please try again in {n} minute.", other: "You've sent several requests in a short time. Please try again in {n} minutes." },
      sending: 'Sending…',
      submit: 'Send Message',
      newTab: '(opens in a new tab)',
    },
  };
}
