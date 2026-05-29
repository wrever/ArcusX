/**
 * JWT HS256 compatible con backend PHP (Firebase JWT) y admin_login.
 */

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export interface ArcusxJwtPayload {
  userId: number;
  username?: string;
  email?: string;
  isAdmin?: boolean;
  role?: string;
}

export async function signArcusxJwt(
  data: ArcusxJwtPayload,
  expiresInSec: number,
): Promise<string> {
  const secret = Deno.env.get('ARCUSX_JWT_SECRET');
  if (!secret) throw new Error('ARCUSX_JWT_SECRET no configurado');

  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iat,
    exp: iat + expiresInSec,
    iss: 'arcusx.pro',
    data: {
      id: data.userId,
      username: data.username,
      email: data.email,
      is_admin: data.isAdmin ?? false,
      role: data.role ?? (data.isAdmin ? 'admin' : 'user'),
    },
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
}

export async function verifyArcusxJwt(token: string): Promise<ArcusxJwtPayload | null> {
  const secret = Deno.env.get('ARCUSX_JWT_SECRET');
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await hmacKey(secret);
  const sig = base64UrlDecode(signatureB64);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sig,
    new TextEncoder().encode(signingInput),
  );
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as {
    exp?: number;
    data?: {
      id?: number;
      username?: string;
      email?: string;
      is_admin?: boolean;
      role?: string;
    };
  };

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000) - 300) {
    return null;
  }

  const id = payload.data?.id;
  if (!id) return null;

  return {
    userId: id,
    username: payload.data?.username,
    email: payload.data?.email,
    isAdmin: Boolean(payload.data?.is_admin) || payload.data?.role === 'admin',
    role: payload.data?.role,
  };
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim();
}
