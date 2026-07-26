/** HMAC attestation for agentic release-on-callback. */

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyAttestationSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!secret?.trim() || !signatureHeader?.trim()) return false;
  const expected = await hmacSha256Hex(secret.trim(), rawBody);
  const provided = signatureHeader.replace(/^sha256=/i, '').trim();
  return expected === provided;
}

export function stablePayloadHash(obj: Record<string, unknown>): string {
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return sorted;
}
