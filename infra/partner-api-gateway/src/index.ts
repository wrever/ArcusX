/**
 * Gateway público para partners — estilo Soroswap / Trustless Work.
 * El integrador solo envía: Authorization: Bearer axk_test_…
 * Este worker inyecta apikey (Supabase anon) en servidor; nunca sale al cliente.
 *
 * Deploy: Cloudflare Workers → api.arcusx.pro
 * Secrets: SUPABASE_ANON_KEY, SUPABASE_ARCUSX_API_ORIGIN
 */

export interface Env {
  SUPABASE_ANON_KEY: string;
  /** e.g. https://<ref>.supabase.co/functions/v1/arcusx-api */
  SUPABASE_ARCUSX_API_ORIGIN: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, idempotency-key, x-arcusx-api-key, x-client-info',
};

function isPartnerKey(value: string): boolean {
  return value.startsWith('axk_test_') || value.startsWith('axk_live_');
}

function partnerKeyFromRequest(req: Request): string | null {
  const explicit =
    req.headers.get('x-arcusx-api-key')?.trim() ??
    req.headers.get('X-ArcusX-Api-Key')?.trim();
  if (explicit && isPartnerKey(explicit)) return explicit;

  const auth = req.headers.get('Authorization')?.trim();
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (isPartnerKey(token)) return token;
  }
  return null;
}

function buildUpstreamUrl(req: Request, env: Env): URL {
  const incoming = new URL(req.url);
  const origin = env.SUPABASE_ARCUSX_API_ORIGIN.replace(/\/$/, '');
  let subpath = incoming.pathname;

  if (subpath.startsWith('/v1/')) {
    subpath = subpath.slice(3);
  } else if (subpath === '/v1') {
    subpath = '';
  }

  const upstream = new URL(`${origin}/v1/${subpath.replace(/^\//, '')}`);
  upstream.search = incoming.search;
  return upstream;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const partnerKey = partnerKeyFromRequest(req);
    if (!partnerKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'missing_api_key',
            message: 'Incluye Authorization: Bearer axk_test_… o axk_live_…',
          },
        }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    if (!env.SUPABASE_ANON_KEY || !env.SUPABASE_ARCUSX_API_ORIGIN) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'gateway_misconfigured', message: 'Gateway misconfigured' } }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const upstreamUrl = buildUpstreamUrl(req, env);
    const headers = new Headers(req.headers);
    headers.set('apikey', env.SUPABASE_ANON_KEY);
    headers.set('x-arcusx-api-key', partnerKey);
    headers.delete('Authorization');

    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
    });

    const outHeaders = new Headers(upstreamRes.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      outHeaders.set(k, v);
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: outHeaders,
    });
  },
};
