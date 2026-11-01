// Netlify Function (v2) for POST /api/contact. Env: CRM_URL, WEBSITE_FORM_SECRET, optional ALLOWED_ORIGINS.
import { handleLead } from '../../lib/lead-proxy.mjs';

export default async (req) => {
  const body = req.method === 'POST' ? await req.text() : '';
  const result = await handleLead({ method: req.method, headers: req.headers, body });
  return new Response(result.body, { status: result.status, headers: result.headers });
};

export const config = { path: '/api/contact' };
