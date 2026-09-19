/**
 * Gateway partner público — solo Authorization: Bearer axk_…
 * Inyecta apikey Supabase en servidor al proxear a arcusx-api.
 */
import { handleOptions } from '../_shared/arcusx-cors.ts';
import { isPartnerApiKey } from '../_shared/partner-api-keys.ts';
import { bearerToken } from '../_shared/arcusx-jwt.ts';

const CORS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, idempotency-key, x-arcusx-api-key, x-arcusx-network, x-client-info',
};

function partnerKey(req: Request): string | null {
  const explicit =
    req.headers.get('x-arcusx-api-key')?.trim() ??
    req.headers.get('X-ArcusX-Api-Key')?.trim();
  if (explicit && isPartnerApiKey(explicit)) return explicit;
  const bearer = bearerToken(req);
  if (bearer && isPartnerApiKey(bearer)) return bearer;
  return null;
}

function upstreamUrl(req: Request, origin: string): string {
  const incoming = new URL(req.url);
  let sub = incoming.pathname;
  const marker = '/arcusx-partner-api';
  const idx = sub.indexOf(marker);
  if (idx >= 0) sub = sub.slice(idx + marker.length);
  if (sub.startsWith('/v1/')) sub = sub.slice(3);
  else if (sub === '/v1') sub = '';
  const base = origin.replace(/\/$/, '');
  const u = new URL(`${base}/v1/${sub.replace(/^\//, '')}`);
  u.search = incoming.search;
  return u.toString();
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) {
    return new Response(null, {
      status: 204,
      headers: { ...CORS, ...Object.fromEntries(new Headers(opt.headers)) },
    });
  }

  const key = partnerKey(req);
  if (!key) {
    return jsonError(
      401,
      'missing_api_key',
      'Incluye Authorization: Bearer axk_test_… o axk_live_…',
    );
  }

  const anon =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('ARCUSX_SUPABASE_ANON_KEY');
  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ??
    Deno.env.get('ARCUSX_SUPABASE_URL');
  if (!anon || !supabaseUrl) {
    return jsonError(503, 'gateway_misconfigured', 'Gateway misconfigured');
  }

  const target = upstreamUrl(req, `${supabaseUrl}/functions/v1/arcusx-api`);
  const headers = new Headers(req.headers);
  headers.set('apikey', anon);
  headers.set('x-arcusx-api-key', key);
  headers.delete('Authorization');

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
  });

  const out = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) out.set(k, v);

  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
});
