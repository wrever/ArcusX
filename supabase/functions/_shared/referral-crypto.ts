const encoder = new TextEncoder();

function salt(): string {
  return Deno.env.get('REFERRAL_HASH_SALT') ?? 'arcusx-referral-v1';
}

export async function sha256Hex(input: string): Promise<string> {
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashWithSalt(value: string): Promise<string> {
  if (!value?.trim()) return '';
  return sha256Hex(`${salt()}:${value.trim().toLowerCase()}`);
}

export function normalizeRefCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '-');
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? '';
  return req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    '';
}
