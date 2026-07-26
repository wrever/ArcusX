import {
  jsonError,
  jsonResponse,
  jsonSuccess,
} from '../../_shared/arcusx-cors.ts';
import {
  upsertUserLink,
  verifySupabaseAccessToken,
} from '../../_shared/arcusx-auth.ts';
import { signArcusxJwt } from '../../_shared/arcusx-jwt.ts';
import type { ApiContext } from './types.ts';
import { isValidStellarG } from './types.ts';
import { requireUser } from './require.ts';

type ArcusxUserRow = {
  id: number;
  username: string;
  email: string;
  supabase_user_id: string | null;
  is_admin: boolean | null;
  role: string | null;
};

function normalizeUsername(base: string, _supabaseUserId: string): string {
  let b = base.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 48);
  if (b.length < 2) b = 'user';
  return b;
}

async function uniqueUsername(
  supabase: ApiContext['supabase'],
  base: string,
  supabaseUserId: string,
): Promise<string> {
  const suffix = supabaseUserId.replace(/-/g, '').slice(0, 8);
  const candidates = [base, `${base}_${suffix}`, `${base}_${suffix}_2`, `${base}_${suffix}_3`];
  for (const c of candidates) {
    const { data } = await supabase.from('arcusx_users').select('id').eq('username', c).maybeSingle();
    if (!data) return c;
  }
  return `${base}_${suffix}_${Date.now()}`;
}

async function findExistingArcusxUser(
  supabase: ApiContext['supabase'],
  email: string,
  supabaseUserId: string,
): Promise<ArcusxUserRow | null> {
  const { data: bySupabase } = await supabase
    .from('arcusx_users')
    .select('id, username, email, supabase_user_id, is_admin, role')
    .eq('supabase_user_id', supabaseUserId)
    .maybeSingle();
  if (bySupabase) return bySupabase as ArcusxUserRow;

  const { data: byEmail } = await supabase
    .from('arcusx_users')
    .select('id, username, email, supabase_user_id, is_admin, role')
    .eq('email', email)
    .maybeSingle();
  return (byEmail as ArcusxUserRow | null) ?? null;
}

async function syncIdentitySequences(supabase: ApiContext['supabase']): Promise<void> {
  const { error } = await supabase.rpc('arcusx_sync_identity_sequences');
  if (error) {
    console.warn('[syncSupabaseUser] arcusx_sync_identity_sequences:', error.message);
  }
}

async function linkSupabaseUserId(
  supabase: ApiContext['supabase'],
  userId: number,
  supabaseUserId: string,
  existingSupabaseUserId: string | null | undefined,
): Promise<void> {
  if (existingSupabaseUserId) return;
  await supabase.from('arcusx_users').update({
    supabase_user_id: supabaseUserId,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
}

async function insertArcusxUser(
  supabase: ApiContext['supabase'],
  row: {
    username: string;
    email: string;
    supabase_user_id: string;
  },
): Promise<{ id: number } | { error: string; code?: string }> {
  const { data: inserted, error } = await supabase.from('arcusx_users').insert({
    username: row.username,
    email: row.email,
    supabase_user_id: row.supabase_user_id,
    role: 'user',
    is_admin: false,
    password_hash: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select('id').single();

  if (error || !inserted) {
    return { error: error?.message ?? 'Error al crear usuario', code: error?.code };
  }
  return { id: inserted.id as number };
}

async function createArcusxUser(
  supabase: ApiContext['supabase'],
  email: string,
  supabaseUserId: string,
  name: string,
  providedUsername: string,
): Promise<{ userId: number; username: string; isNew: boolean } | { error: string }> {
  const base = normalizeUsername(
    providedUsername || name.replace(/\s/g, '') || email.split('@')[0],
    supabaseUserId,
  );
  const username = await uniqueUsername(supabase, base, supabaseUserId);

  let result = await insertArcusxUser(supabase, { username, email, supabase_user_id: supabaseUserId });

  if ('error' in result) {
    const raced = await findExistingArcusxUser(supabase, email, supabaseUserId);
    if (raced) {
      await linkSupabaseUserId(supabase, raced.id, supabaseUserId, raced.supabase_user_id);
      return { userId: raced.id, username: raced.username, isNew: false };
    }

    const isPkey = result.code === '23505' &&
      (result.error.includes('arcusx_users_pkey') || result.error.includes('duplicate key'));
    if (isPkey) {
      await syncIdentitySequences(supabase);
      result = await insertArcusxUser(supabase, { username, email, supabase_user_id: supabaseUserId });
    }
  }

  if ('error' in result) {
    const raced = await findExistingArcusxUser(supabase, email, supabaseUserId);
    if (raced) {
      await linkSupabaseUserId(supabase, raced.id, supabaseUserId, raced.supabase_user_id);
      return { userId: raced.id, username: raced.username, isNew: false };
    }
    return { error: result.error };
  }

  return { userId: result.id, username, isNew: true };
}

export async function syncSupabaseUser(ctx: ApiContext): Promise<Response> {
  const { req, supabase, body } = ctx;
  const supabaseUserId = String(body.supabase_user_id ?? '');
  const email = String(body.email ?? '').toLowerCase();
  const name = String(body.name ?? email.split('@')[0] ?? 'user');
  const accessToken = String(body.supabase_access_token ?? '');

  if (!supabaseUserId || !email) {
    return jsonError(req, 'Datos incompletos', 400);
  }
  if (!accessToken) {
    return jsonError(req, 'Sesión OAuth no válida', 401, 'missing_token');
  }
  const ok = await verifySupabaseAccessToken(accessToken, supabaseUserId, email);
  if (!ok) {
    return jsonError(req, 'Sesión OAuth no válida', 401, 'token_verify_failed');
  }

  const existing = await findExistingArcusxUser(supabase, email, supabaseUserId);

  let userId: number;
  let username: string;
  let isAdmin = false;
  let role = 'user';
  let isNewUser = false;

  if (existing) {
    userId = existing.id;
    username = existing.username;
    isAdmin = existing.is_admin === true || existing.role === 'admin';
    role = String(existing.role ?? (isAdmin ? 'admin' : 'user'));
    await linkSupabaseUserId(supabase, userId, supabaseUserId, existing.supabase_user_id);
  } else {
    const provided = String(body.username ?? '').trim();
    const created = await createArcusxUser(supabase, email, supabaseUserId, name, provided);
    if ('error' in created) {
      return jsonError(req, created.error, 500);
    }
    userId = created.userId;
    username = created.username;
    isNewUser = created.isNew;
    isAdmin = false;
    role = 'user';
  }

  await upsertUserLink(supabase, supabaseUserId, userId);

  const { data: profileRow } = await supabase
    .from('arcusx_users')
    .select('account_type, kyc_status, is_admin, role')
    .eq('id', userId)
    .single();

  if (profileRow) {
    isAdmin = profileRow.is_admin === true || profileRow.role === 'admin';
    role = String(profileRow.role ?? (isAdmin ? 'admin' : 'user'));
  }

  const token = await signArcusxJwt({
    userId,
    username,
    email,
    isAdmin,
    role,
  }, 3600 * 24 * 7);

  return jsonSuccess(req, {
    token,
    user: {
      id: userId,
      username,
      email,
      is_admin: isAdmin,
      role,
      account_type: profileRow?.account_type ?? 'individual',
      kyc_status: profileRow?.kyc_status ?? 'not_required',
    },
    is_new_user: isNewUser,
    referral: null,
  });
}

export async function registerWallet(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);
  const wallet = String(
    ctx.body.private_payout_wallet ?? ctx.body.wallet_address ?? '',
  ).trim();
  if (!isValidStellarG(wallet)) {
    return jsonError(req, 'La dirección de wallet Stellar no es válida.', 400);
  }

  const { data: row } = await auth.supabase
    .from('arcusx_users')
    .select('private_payout_wallet')
    .eq('id', auth.userId)
    .single();

  const previous = String(row?.private_payout_wallet ?? '').trim();
  if (previous === wallet) {
    return jsonSuccess(req, {
      message: 'Sin cambios en la wallet de cobro',
      wallet_address: wallet,
      private_payout_wallet: wallet,
      already_registered: true,
      changed: false,
    });
  }

  const { data: duplicate } = await auth.supabase
    .from('arcusx_users')
    .select('id, username')
    .eq('private_payout_wallet', wallet)
    .neq('id', auth.userId)
    .maybeSingle();

  if (duplicate) {
    return jsonError(req, 'Esa wallet ya está registrada por otro usuario.', 409);
  }

  const { error } = await auth.supabase
    .from('arcusx_users')
    .update({
      private_payout_wallet: wallet,
      wallet_address: wallet,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auth.userId);

  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, {
    message: previous ? 'Wallet de cobro actualizada' : 'Wallet de cobro registrada',
    wallet_address: wallet,
    private_payout_wallet: wallet,
    changed: true,
  });
}

/** Solo wallet registrada en Configuración (ofertas privadas), no Freighter conectada. */
export async function verifyWallet(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);
  const { data, error } = await auth.supabase
    .from('arcusx_users')
    .select('private_payout_wallet, wallet_address')
    .eq('id', auth.userId)
    .single();

  if (error) {
    return jsonResponse(req, {
      success: true,
      has_wallet: false,
      wallet_address: null,
      private_payout_wallet: null,
    });
  }

  const privateW = String(data?.private_payout_wallet ?? '').trim();
  const legacyW = String(data?.wallet_address ?? '').trim();
  const w = isValidStellarG(privateW)
    ? privateW
    : isValidStellarG(legacyW)
      ? legacyW
      : null;
  return jsonResponse(req, {
    success: true,
    has_wallet: Boolean(w),
    wallet_address: w,
    private_payout_wallet: isValidStellarG(privateW) ? privateW : w,
  });
}
