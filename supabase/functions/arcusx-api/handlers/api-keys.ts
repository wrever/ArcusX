import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import {
  assertPartnerOwnedByUser,
  countActiveKeys,
  ensureUserPartner,
  insertPartnerApiKeyUnique,
  MAX_ACTIVE_KEYS,
} from '../../_shared/user-partner.ts';
import type { ApiContext } from './types.ts';
import { qp } from './types.ts';
import { requireUser } from './require.ts';

function serializeKey(row: Record<string, unknown>) {
  return {
    id: row.id,
    label: row.label,
    key_prefix: row.key_prefix,
    sandbox: row.sandbox,
    rate_limit_per_min: row.rate_limit_per_min,
    created_at: row.created_at,
    last_used_at: row.last_used_at,
    revoked_at: row.revoked_at ?? null,
  };
}

/** URL pública del Partner API Gateway (Cloudflare). Integradores no usan Supabase directo. */
const PARTNER_PUBLIC_API_BASE = 'https://api.arcusx.pro';

/** GET list_user_api_keys + GET api_keys_context */
export async function getApiKeysContext(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  try {
    const auth = await requireUser(ctx);

    const { data: userRow } = await auth.supabase
      .from('arcusx_users')
      .select('id, username, email')
      .eq('id', auth.userId)
      .maybeSingle();

    const displayName = String(userRow?.username ?? userRow?.email ?? `user-${auth.userId}`);
    const { partnerId, sandbox } = await ensureUserPartner(auth.supabase, auth.userId, displayName);

    return jsonSuccess(req, {
      partner_id: partnerId,
      sandbox,
      max_active_keys: MAX_ACTIVE_KEYS,
      api_base_url: PARTNER_PUBLIC_API_BASE,
      api_v1_url: `${PARTNER_PUBLIC_API_BASE}/v1`,
      sdk_headers: {
        Authorization: 'Bearer axk_test_… (tu API key)',
      },
      docs_hint:
        'Solo necesitas ARCUSX_API_KEY en tu servidor. El gateway inyecta credenciales Supabase — no se las des a integradores.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al cargar contexto';
    if (msg === 'partner_suspended') {
      return jsonError(req, 'Cuenta de integración suspendida', 403, 'partner_suspended');
    }
    if (msg === 'Unauthorized') {
      return jsonError(req, 'Unauthorized', 401, 'invalid_or_missing_token');
    }
    return jsonError(req, msg, 500);
  }
}

/** GET list_user_api_keys */
export async function listUserApiKeys(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  try {
    const auth = await requireUser(ctx);
    const { partnerId } = await ensureUserPartner(auth.supabase, auth.userId);

    const { data, error } = await auth.supabase
      .from('arcusx_partner_keys')
      .select('id, label, key_prefix, sandbox, rate_limit_per_min, created_at, last_used_at, revoked_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (error) return jsonError(req, error.message, 500);

    const keys = (data ?? []).map((row) => serializeKey(row as Record<string, unknown>));
    const active = keys.filter((k) => !k.revoked_at);

    return jsonSuccess(req, {
      partner_id: partnerId,
      keys,
      active_count: active.length,
      max_active_keys: MAX_ACTIVE_KEYS,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al listar API keys';
    if (msg === 'Unauthorized') return jsonError(req, 'Unauthorized', 401, 'invalid_or_missing_token');
    return jsonError(req, msg, 500);
  }
}

/** POST create_user_api_key */
export async function createUserApiKey(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);

  const label = String(body.label ?? 'default').trim().slice(0, 64) || 'default';
  const sandbox = body.sandbox === false ? false : true;

  const { data: userRow } = await auth.supabase
    .from('arcusx_users')
    .select('username, email')
    .eq('id', auth.userId)
    .maybeSingle();

  const { partnerId } = await ensureUserPartner(
    auth.supabase,
    auth.userId,
    String(userRow?.username ?? userRow?.email ?? ''),
  );

  const activeCount = await countActiveKeys(auth.supabase, partnerId);
  if (activeCount >= MAX_ACTIVE_KEYS) {
    return jsonError(
      req,
      `Máximo ${MAX_ACTIVE_KEYS} API keys activas. Revoca una antes de crear otra.`,
      400,
      'max_keys_reached',
    );
  }

  try {
    const { rawKey, row } = await insertPartnerApiKeyUnique(
      auth.supabase,
      {
        partner_id: partnerId,
        sandbox,
        rate_limit_per_min: 120,
      },
      label,
    );

    return jsonSuccess(req, {
      api_key: rawKey,
      key: serializeKey(row),
      partner_id: partnerId,
      warning:
        'Guarda esta key en un gestor de secretos. No se volverá a mostrar. Si la pierdes, revócala y crea una nueva.',
    }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al crear API key';
    return jsonError(req, msg, 500, 'create_api_key_failed');
  }
}

/** POST revoke_user_api_key */
export async function revokeUserApiKey(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);

  const keyId = String(body.key_id ?? qp(ctx.url, 'key_id') ?? '').trim();
  if (!keyId) return jsonError(req, 'key_id requerido', 400);

  const { partnerId } = await ensureUserPartner(auth.supabase, auth.userId);

  const { data: keyRow } = await auth.supabase
    .from('arcusx_partner_keys')
    .select('id, partner_id, revoked_at')
    .eq('id', keyId)
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (!keyRow) return jsonError(req, 'API key no encontrada', 404);
  if (keyRow.revoked_at) {
    return jsonSuccess(req, { key_id: keyId, revoked: true, idempotent: true });
  }

  const now = new Date().toISOString();
  const { error } = await auth.supabase
    .from('arcusx_partner_keys')
    .update({ revoked_at: now })
    .eq('id', keyId);

  if (error) return jsonError(req, error.message, 500);

  return jsonSuccess(req, { key_id: keyId, revoked: true, revoked_at: now });
}

/** Valida que partnerId del header pertenezca al JWT user (si aplica). */
export async function validatePartnerUserBinding(
  supabase: ApiContext['supabase'],
  partnerId: string | null | undefined,
  userId: number | null,
): Promise<string | null> {
  if (!partnerId || !userId) return null;
  try {
    await assertPartnerOwnedByUser(supabase, partnerId, userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'forbidden';
    if (msg === 'api_key_user_mismatch') return msg;
    if (msg === 'partner_suspended') return msg;
    return 'forbidden';
  }
  return null;
}
