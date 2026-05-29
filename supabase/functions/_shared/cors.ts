const DEFAULT_ORIGINS = [
  'https://arcusx.pro',
  'https://www.arcusx.pro',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = Deno.env.get('REFERRAL_CORS_ORIGINS')?.split(',').map((s) => s.trim()) ??
    DEFAULT_ORIGINS;
  const ok = allowed.includes(origin) || allowed.includes('*');
  return {
    'Access-Control-Allow-Origin': ok ? (origin || allowed[0]) : allowed[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-referral-internal-secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  req: Request,
  message: string,
  status = 400,
): Response {
  return jsonResponse(req, { success: false, message }, status);
}
