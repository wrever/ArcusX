/**
 * Valida el JWT de admin emitido por admin_login.php (HS256, ARCUSX_JWT_SECRET).
 */

function bearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim();
}

function base64UrlDecode(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface PhpAdminPayload {
  userId: number;
  email?: string;
  username?: string;
}

export async function requirePhpAdminJwt(req: Request): Promise<PhpAdminPayload> {
  const token = bearerToken(req);
  if (!token) throw new Error('Authorization Bearer requerido');

  const secret = Deno.env.get('ARCUSX_JWT_SECRET');
  if (!secret) {
    throw new Error('ARCUSX_JWT_SECRET no configurado en Edge');
  }

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token inválido');

  const [headerB64, payloadB64, signatureB64] = parts;
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const sig = base64UrlDecode(signatureB64);
  const valid = await crypto.subtle.verify('HMAC', key, sig, data);
  if (!valid) throw new Error('Token inválido o expirado');

  const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
  const payload = JSON.parse(payloadJson) as {
    exp?: number;
    data?: {
      id?: number;
      is_admin?: boolean;
      role?: string;
      email?: string;
      username?: string;
    };
  };

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expirado');
  }

  const d = payload.data;
  if (!d?.is_admin && d?.role !== 'admin') {
    throw new Error('No autorizado: se requiere admin');
  }

  if (!d?.id) throw new Error('Token sin user id');

  return {
    userId: d.id,
    email: d.email,
    username: d.username,
  };
}
