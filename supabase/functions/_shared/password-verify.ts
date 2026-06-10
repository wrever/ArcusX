import { compare } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

/** PHP `password_hash()` usa prefijo $2y$; la lib bcrypt de Deno espera $2a$/$2b$. */
export function normalizePhpBcryptHash(hash: string): string {
  const h = hash.trim();
  if (h.startsWith('$2y$')) return `$2a$${h.slice(4)}`;
  return h;
}

export function isLikelyBcryptHash(hash: string): boolean {
  const h = hash.trim();
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(h);
}

export async function verifyPassword(
  plain: string,
  storedHash: string,
): Promise<boolean> {
  const hash = String(storedHash ?? '').trim();
  if (!hash || !isLikelyBcryptHash(hash)) return false;
  try {
    return await compare(plain, normalizePhpBcryptHash(hash));
  } catch {
    return false;
  }
}
