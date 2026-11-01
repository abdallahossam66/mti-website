// Lead rules shared by the browser form (form.js) and the server proxy (lib/lead-proxy.mjs).
// Mirrors the CRM contract: POST {CRM_URL}/api/website/leads. Approved strings come from the brief, verbatim.
import { COUNTRY_CODES } from './countries.js';

export const INDUSTRIES = [
  'Manufacturing & Industrial',
  'Healthcare',
  'Real Estate & Construction',
  'Banking & Financial Services',
  'Retail & E-commerce',
  'Education',
  'Logistics & Transportation',
  'Hospitality & Tourism',
  'Energy & Utilities',
  'Telecommunications',
  'Professional Services',
  'Government & Public Sector',
];

export const SERVICES = [
  'AI Solutions & Intelligent Automation',
  'AI Agents & Virtual Assistants',
  'Custom Software Development',
  'Enterprise AI & Knowledge Systems',
  'Conversational AI & Voice Solutions',
  'Data Intelligence & Business Analytics',
  'Digital Transformation & System Integration',
  'Cybersecurity & Information Security',
];

// "3–6 months" and "6–12 months" use an en dash (U+2013), exactly as the CRM expects.
export const TIMELINES = ['As soon as possible', 'Within 3 months', '3–6 months', '6–12 months', 'Not decided yet'];

export const LIMITS = { name: 120, business_email: 190, company: 160, phone: 40, message: 4000, page_url: 500, referrer: 500, utm: 120 };

// Hidden spam trap; never forwarded to the CRM.
export const HONEYPOT = 'company_website';

// Every key the CRM accepts. Anything else (e.g. a budget field) is dropped before forwarding.
export const LEAD_KEYS = ['name', 'business_email', 'company', 'phone', 'country', 'industry', 'interested_services', 'timeline', 'message', 'consent', 'page_url', 'referrer', 'utm'];
const TEXT_KEYS = ['name', 'business_email', 'company', 'phone', 'country', 'industry', 'timeline', 'message'];
const UTM_KEYS = ['source', 'medium', 'campaign'];

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE = /^[0-9+().\-\s]+$/;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Keeps only contract keys, trims text, drops empty optional values. Non-string values are kept so validation reports them. */
export function sanitizeLead(input) {
  const src = isPlainObject(input) ? input : {};
  const lead = {};
  for (const key of TEXT_KEYS) {
    const value = src[key];
    if (typeof value === 'string') {
      const text = key === 'message' ? value.trim() : value.trim().replace(/\s+/g, ' ');
      if (text) lead[key] = key === 'country' ? text.toUpperCase() : text;
    } else if (value !== undefined && value !== null) {
      lead[key] = value;
    }
  }
  if (Array.isArray(src.interested_services)) {
    const list = [...new Set(src.interested_services.map((s) => (typeof s === 'string' ? s.trim() : s)).filter((s) => s !== ''))];
    if (list.length) lead.interested_services = list;
  } else if (src.interested_services !== undefined && src.interested_services !== null) {
    lead.interested_services = src.interested_services;
  }
  if (src.consent !== undefined) lead.consent = src.consent;
  for (const key of ['page_url', 'referrer']) {
    if (typeof src[key] === 'string' && src[key].trim()) lead[key] = src[key].trim().slice(0, LIMITS[key]);
  }
  if (isPlainObject(src.utm)) {
    const utm = {};
    for (const key of UTM_KEYS) {
      if (typeof src.utm[key] === 'string' && src.utm[key].trim()) utm[key] = src.utm[key].trim().slice(0, LIMITS.utm);
    }
    if (Object.keys(utm).length) lead.utm = utm;
  }
  return lead;
}

// English messages; the proxy always uses these. Pages in other languages pass their own table to validateLead().
export const MESSAGES_EN = {
  name: { required: 'Please enter your full name.', invalid: 'Please enter a valid full name.', tooLong: 'Your full name must be {max} characters or fewer.' },
  business_email: { required: 'Please enter your business email.', invalid: 'Please enter a valid email address, for example name@company.com.', tooLong: 'Your business email must be {max} characters or fewer.' },
  company: { required: 'Please enter your company name.', invalid: 'Please enter a valid company name.', tooLong: 'Your company name must be {max} characters or fewer.' },
  phone: { invalid: 'Please enter a valid phone number, using digits and optionally + ( ) - .', tooLong: 'Your phone number must be {max} characters or fewer.' },
  country: { invalid: 'Please choose a country from the list.' },
  industry: { invalid: 'Please choose an industry from the list.' },
  interested_services: { invalid: 'Please choose services from the list.' },
  timeline: { invalid: 'Please choose a project timeline from the list.' },
  message: { invalid: 'Please enter a valid message.', tooLong: 'Your message must be {max} characters or fewer.' },
  consent: { required: 'Please confirm that we may use your information to respond to your enquiry.' },
};

/** Returns {} when valid, otherwise { field: code } with code 'required' | 'invalid' | 'tooLong'. Expects sanitized input. */
export function checkLead(lead) {
  const codes = {};
  const text = (field, required = false) => {
    const value = lead[field];
    if (value === undefined) { if (required) codes[field] = 'required'; return false; }
    if (typeof value !== 'string') { codes[field] = 'invalid'; return false; }
    if (value.length > LIMITS[field]) { codes[field] = 'tooLong'; return false; }
    return true;
  };

  text('name', true);
  if (text('business_email', true) && !EMAIL.test(lead.business_email)) codes.business_email = 'invalid';
  text('company', true);
  if (text('phone') && (!PHONE.test(lead.phone) || lead.phone.replace(/\D/g, '').length < 6)) codes.phone = 'invalid';
  if (lead.country !== undefined && !(typeof lead.country === 'string' && COUNTRY_CODES.has(lead.country))) codes.country = 'invalid';
  if (lead.industry !== undefined && !INDUSTRIES.includes(lead.industry)) codes.industry = 'invalid';
  if (lead.interested_services !== undefined) {
    const list = lead.interested_services;
    if (!Array.isArray(list) || !list.length || !list.every((s) => SERVICES.includes(s))) codes.interested_services = 'invalid';
  }
  if (lead.timeline !== undefined && !TIMELINES.includes(lead.timeline)) codes.timeline = 'invalid';
  text('message');
  if (lead.consent !== true) codes.consent = 'required';
  return codes;
}

/** Returns {} when valid, otherwise { field: [message] } in the CRM's 422 shape. Expects sanitized input. */
export function validateLead(lead, messages = MESSAGES_EN) {
  const errors = {};
  for (const [field, code] of Object.entries(checkLead(lead))) {
    const template = messages[field]?.[code] ?? MESSAGES_EN[field][code];
    errors[field] = [template.replace('{max}', String(LIMITS[field]))];
  }
  return errors;
}
