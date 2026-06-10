const DEFAULT_ORIGINS = [
  'https://arcusx.pro',
  'https://www.arcusx.pro',
  'https://empresas.arcusx.pro',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function buildAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ARCUSX_CORS_ORIGINS') ??
    Deno.env.get('REFERRAL_CORS_ORIGINS');
  const fromEnv = envOrigins?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  // Siempre incluir DEFAULT_ORIGINS (empresas.*, localhost) aunque el secret solo liste arcusx.pro
  return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])];
}

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = buildAllowedOrigins();
  const ok = allowed.includes(origin) || allowed.includes('*');
  return {
    'Access-Control-Allow-Origin': ok ? (origin || allowed[0]) : allowed[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, idempotency-key, x-referral-internal-secret',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json; charset=UTF-8' },
  });
}

export function jsonSuccess(req: Request, extra: Record<string, unknown> = {}, status = 200): Response {
  return jsonResponse(req, { success: true, ...extra }, status);
}

export function jsonError(
  req: Request,
  message: string,
  status = 400,
  error?: string,
): Response {
  const body: Record<string, unknown> = { success: false, message };
  if (error) body.error = error;
  return jsonResponse(req, body, status);
}
