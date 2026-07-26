import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_ACTIVE_KEYS = 5;
const KEY_SECRET_BYTES = 32;
const INSERT_KEY_MAX_ATTEMPTS = 5;

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generatePartnerApiKey(sandbox: boolean): { rawKey: string; keyHash: string; keyPrefix: string } {
  const prefix = sandbox ? 'axk_test_' : 'axk_live_';
  const secret = crypto.getRandomValues(new Uint8Array(KEY_SECRET_BYTES));
  const secretB64 = btoa(String.fromCharCode(...secret))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const rawKey = `${prefix}${secretB64}`;
  return {
    rawKey,
    keyHash: '', // filled async
    keyPrefix: `${rawKey.slice(0, 16)}…`,
  };
}

export async function buildPartnerApiKey(sandbox: boolean) {
  const base = generatePartnerApiKey(sandbox);
  const keyHash = await sha256Hex(base.rawKey);
  return { ...base, keyHash };
}

export type InsertPartnerKeyInput = {
  partner_id: string;
  key_hash: string;
  key_prefix: string;
  label: string;
  sandbox: boolean;
  rate_limit_per_min?: number;
};

/** Inserta key con reintentos si hay colisión de hash (extremadamente raro). */
export async function insertPartnerApiKeyUnique(
  supabase: SupabaseClient,
  input: Omit<InsertPartnerKeyInput, 'key_hash' | 'key_prefix'> & { sandbox: boolean },
  label: string,
): Promise<{ rawKey: string; row: Record<string, unknown> }> {
  let lastError: { code?: string; message?: string } | null = null;

  for (let attempt = 0; attempt < INSERT_KEY_MAX_ATTEMPTS; attempt += 1) {
    const { rawKey, keyHash, keyPrefix } = await buildPartnerApiKey(input.sandbox);
    const { data: row, error } = await supabase
      .from('arcusx_partner_keys')
      .insert({
        partner_id: input.partner_id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        label,
        sandbox: input.sandbox,
        rate_limit_per_min: input.rate_limit_per_min ?? 120,
      })
      .select('id, label, key_prefix, sandbox, created_at, last_used_at, revoked_at, rate_limit_per_min')
      .single();

    if (!error && row) {
      return { rawKey, row: row as Record<string, unknown> };
    }

    lastError = error;
    if (error?.code === '23505') {
      continue;
    }
    throw new Error(error?.message ?? 'insert_partner_key_failed');
  }

  throw new Error(lastError?.message ?? 'api_key_collision');
}

export async function ensureUserPartner(
  supabase: SupabaseClient,
  userId: number,
  displayName?: string,
): Promise<{ partnerId: string; sandbox: boolean }> {
  const { data: existing } = await supabase
    .from('arcusx_partners')
    .select('id, sandbox, status')
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (existing?.id) {
    if (existing.status === 'suspended') {
      throw new Error('partner_suspended');
    }
    return { partnerId: String(existing.id), sandbox: Boolean(existing.sandbox) };
  }

  const slug = `user-${userId}`;
  const name = displayName?.trim() || `ArcusX user ${userId}`;
  const { data: created, error } = await supabase
    .from('arcusx_partners')
    .insert({
      name,
      slug,
      owner_user_id: userId,
      sandbox: true,
      status: 'active',
      contact_email: null,
    })
    .select('id, sandbox')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('arcusx_partners')
        .select('id, sandbox')
        .eq('owner_user_id', userId)
        .maybeSingle();
      if (retry?.id) return { partnerId: String(retry.id), sandbox: Boolean(retry.sandbox) };
    }
    throw new Error(error.message);
  }

  return { partnerId: String(created.id), sandbox: Boolean(created.sandbox) };
}

export async function assertPartnerOwnedByUser(
  supabase: SupabaseClient,
  partnerId: string,
  userId: number,
): Promise<void> {
  const { data: partner } = await supabase
    .from('arcusx_partners')
    .select('owner_user_id, status')
    .eq('id', partnerId)
    .maybeSingle();

  if (!partner) throw new Error('partner_not_found');
  if (partner.status === 'suspended') throw new Error('partner_suspended');

  const ownerId = partner.owner_user_id != null ? Number(partner.owner_user_id) : null;
  if (ownerId != null && ownerId !== userId) {
    throw new Error('api_key_user_mismatch');
  }
}

export async function countActiveKeys(
  supabase: SupabaseClient,
  partnerId: string,
): Promise<number> {
  const { count } = await supabase
    .from('arcusx_partner_keys')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .is('revoked_at', null);
  return count ?? 0;
}

export { MAX_ACTIVE_KEYS };

export async function touchPartnerKeyUsed(
  supabase: SupabaseClient,
  keyHash: string,
): Promise<void> {
  await supabase
    .from('arcusx_partner_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash)
    .is('revoked_at', null);
}
