/**
 * Controles de seguridad Edge — defensa en profundidad (complementa multisig on-chain).
 */

const DEFAULT_ORIGINS = [
  'https://arcusx.pro',
  'https://www.arcusx.pro',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const MAX_BODY_BYTES = 32_768;

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
};

function allowedOrigins(): string[] {
  const raw = Deno.env.get('ESCROW_CORS_ORIGINS');
  if (!raw?.trim()) return DEFAULT_ORIGINS;
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function corsHeadersForRequest(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowed = allowedOrigins();
  const match = origin && allowed.includes(origin) ? origin : allowed[0];

  return {
    'Access-Control-Allow-Origin': match,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    Vary: 'Origin',
    ...SECURITY_HEADERS,
  };
}

export function handleSecureOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersForRequest(req) });
  }
  return null;
}

export function secureJsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersForRequest(req),
      'Content-Type': 'application/json',
    },
  });
}

export function secureErrorResponse(
  req: Request,
  message: string,
  status = 400,
): Response {
  return secureJsonResponse(req, { error: message }, status);
}

/** Límite básico por IP + acción (best-effort en Edge; usar WAF en prod). */
export function enforceRateLimit(
  req: Request,
  action: string,
  maxPerWindow = 30,
  windowMs = 60_000,
): void {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown';
  const key = `${action}:${ip}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > maxPerWindow) {
    throw new Error('Demasiadas solicitudes; intenta más tarde');
  }
}

export async function readJsonBody<T = Record<string, unknown>>(
  req: Request,
): Promise<T> {
  const len = req.headers.get('content-length');
  if (len && Number(len) > MAX_BODY_BYTES) {
    throw new Error('Body demasiado grande');
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new Error('Body demasiado grande');
  }
  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}

const TX_HASH_RE = /^[a-f0-9]{64}$/;

export function assertTxHash(hash: string): void {
  if (!hash || !TX_HASH_RE.test(hash)) {
    throw new Error('tx_hash inválido');
  }
}

/** Hash IP para auditoría sin guardar IP en claro (SHA-256 truncado). */
export async function hashIpForAudit(req: Request): Promise<string | null> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!ip) return null;
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function sanitizeLogMetadata(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  const forbidden = /secret|password|xdr|private|token/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (forbidden.test(k)) continue;
    if (typeof v === 'string' && v.startsWith('S') && v.length > 40) continue;
    out[k] = v;
  }
  return out;
}
