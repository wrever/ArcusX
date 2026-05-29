const DEFAULT_ORIGINS = [
  'https://arcusx.pro',
  'https://www.arcusx.pro',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function allowedOrigins(): string[] {
  const extra = Deno.env.get('REFERRAL_CORS_ORIGINS')?.split(',').map((s) => s.trim()) ??
    [];
  return [...DEFAULT_ORIGINS, ...extra].filter(Boolean);
}

/**
 * Endpoints pre-login: rechaza curl sin Origin/Referer de arcusx (no es secreto, sube la barra).
 */
export function assertPublicBrowserOrigin(req: Request): void {
  const allowed = allowedOrigins();
  const origin = req.headers.get('Origin')?.trim() ?? '';
  if (origin && allowed.includes(origin)) return;

  const referer = req.headers.get('Referer')?.trim() ?? '';
  if (referer) {
    for (const base of allowed) {
      if (referer.startsWith(base)) return;
    }
  }

  throw new Error('Origen no permitido');
}

/** Respuesta genérica: no revelar si el código existe, expiró o el partner está inactivo. */
export function invalidCodePayload() {
  return { success: true, valid: false as const };
}
