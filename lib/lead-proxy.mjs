// /api/contact proxy core. Platform-neutral: the Netlify Function and the Node server wrap it.
// Adds the X-Website-Secret header from the environment and forwards the lead to the CRM.
// The secret never reaches the browser, a response body or a log line.
import { HONEYPOT, LEAD_KEYS, sanitizeLead, validateLead } from '../public/assets/js/lead-rules.js';

export const MAX_BODY_BYTES = 16 * 1024;
const GENERIC_ERROR = "We couldn't send your message right now. Please try again, or contact us directly.";
const CHECK_FIELDS = 'Please check the highlighted fields.';

/** Console logger that redacts the secret from every line as a second line of defence. */
export function createLogger(secret, sink = console) {
  const redact = (msg) => (secret ? String(msg).split(secret).join('[redacted]') : String(msg));
  return {
    info: (msg) => sink.log(redact(`[contact] ${msg}`)),
    warn: (msg) => sink.warn(redact(`[contact] ${msg}`)),
    error: (msg) => sink.error(redact(`[contact] ${msg}`)),
  };
}

const getHeader = (headers, name) =>
  (typeof headers?.get === 'function' ? headers.get(name) : headers?.[name.toLowerCase()]) ?? '';

function json(status, body, headers = {}) {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
    body: JSON.stringify(body),
  };
}

function originAllowed(origin, host, allowList) {
  if (!origin) return false;
  const allowed = (allowList || '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
  if (allowed.length) return allowed.includes(origin);
  try { return new URL(origin).host === host; } catch { return false; }
}

/** Keeps only CRM error keys for fields we know, as arrays of strings. */
function knownErrors(errors) {
  const out = {};
  if (errors && typeof errors === 'object') {
    for (const [key, messages] of Object.entries(errors)) {
      const base = key.split('.')[0];
      if (!LEAD_KEYS.includes(base)) continue;
      const list = (Array.isArray(messages) ? messages : [messages]).filter((m) => typeof m === 'string');
      if (list.length) out[key] = list;
    }
  }
  return out;
}

/**
 * @param {{ method: string, headers: Headers|Record<string,string>, body: string }} req
 * @param {{ env?: Record<string,string|undefined>, fetch?: typeof fetch, log?: ReturnType<typeof createLogger>, timeoutMs?: number }} deps
 * @returns {Promise<{ status: number, headers: Record<string,string>, body: string }>}
 */
export async function handleLead(req, { env = process.env, fetch = globalThis.fetch, log, timeoutMs = 10_000 } = {}) {
  const logger = log ?? createLogger(env.WEBSITE_FORM_SECRET);

  if (req.method !== 'POST') return json(405, { message: 'Method not allowed.' }, { Allow: 'POST' });

  const missing = ['CRM_URL', 'WEBSITE_FORM_SECRET'].filter((key) => !env[key]);
  if (missing.length) {
    logger.error(`misconfigured: missing environment variable(s) ${missing.join(', ')}`);
    return json(500, { message: GENERIC_ERROR });
  }

  const origin = getHeader(req.headers, 'origin');
  if (!originAllowed(origin, getHeader(req.headers, 'host'), env.ALLOWED_ORIGINS)) {
    logger.warn(`rejected origin "${origin.slice(0, 100)}"`);
    return json(403, { message: 'Forbidden.' });
  }
  if (!getHeader(req.headers, 'content-type').toLowerCase().startsWith('application/json')) {
    return json(415, { message: 'Content-Type must be application/json.' });
  }
  const raw = typeof req.body === 'string' ? req.body : '';
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, { message: 'Request is too large.' });

  let data;
  try { data = JSON.parse(raw); } catch { data = undefined; }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return json(400, { message: 'Invalid JSON body.' });

  if (typeof data[HONEYPOT] === 'string' && data[HONEYPOT].trim() !== '') {
    logger.info('honeypot triggered; lead discarded');
    return json(201, { status: 'received' });
  }

  const lead = sanitizeLead(data);
  const errors = validateLead(lead);
  if (Object.keys(errors).length) {
    logger.info(`validation failed fields=[${Object.keys(errors).join(',')}]`);
    return json(422, { message: CHECK_FIELDS, errors });
  }

  let res;
  try {
    res = await fetch(`${env.CRM_URL.replace(/\/+$/, '')}/api/website/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Website-Secret': env.WEBSITE_FORM_SECRET },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    logger.error(`CRM unreachable (${err?.name === 'TimeoutError' ? 'timeout' : err?.name || 'error'})`);
    return json(502, { message: GENERIC_ERROR });
  }

  const payload = await res.json().catch(() => null);
  switch (res.status) {
    case 201: {
      const reference = typeof payload?.reference === 'string' ? payload.reference.slice(0, 64) : undefined;
      logger.info(`lead forwarded ref=${reference ?? 'none'}`);
      return json(201, reference ? { status: 'received', reference } : { status: 'received' });
    }
    case 422: {
      const crmErrors = knownErrors(payload?.errors);
      logger.warn(`CRM 422 fields=[${Object.keys(payload?.errors || {}).join(',')}]`);
      return json(422, { message: typeof payload?.message === 'string' ? payload.message : CHECK_FIELDS, errors: crmErrors });
    }
    case 429: {
      logger.warn('CRM 429 rate limited');
      const retryAfter = res.headers.get('retry-after');
      return json(429, { message: 'Too many requests. Please try again later.' }, retryAfter ? { 'Retry-After': retryAfter } : {});
    }
    case 404:
      logger.error('CRM returned 404: check WEBSITE_FORM_SECRET and CRM_URL');
      return json(502, { message: GENERIC_ERROR });
    default:
      logger.error(`CRM returned ${res.status}`);
      return json(502, { message: GENERIC_ERROR });
  }
}
