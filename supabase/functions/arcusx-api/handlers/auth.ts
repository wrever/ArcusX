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

function normalizeUsername(base: string, supabaseUserId: string): string {
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

  const { data: existing } = await supabase
    .from('arcusx_users')
    .select('id, username, email, supabase_user_id')
    .or(`email.eq.${email},supabase_user_id.eq.${supabaseUserId}`)
    .limit(1)
    .maybeSingle();

  let userId: number;
  let username: string;
  let isNewUser = false;

  if (existing) {
    userId = existing.id as number;
    username = existing.username as string;
    if (!existing.supabase_user_id) {
      await supabase.from('arcusx_users').update({
        supabase_user_id: supabaseUserId,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }
  } else {
    isNewUser = true;
    const provided = String(body.username ?? '').trim();
    const base = normalizeUsername(
      provided || name.replace(/\s/g, '') || email.split('@')[0],
      supabaseUserId,
    );
    username = await uniqueUsername(supabase, base, supabaseUserId);
    const { data: inserted, error } = await supabase.from('arcusx_users').insert({
      username,
      email,
      supabase_user_id: supabaseUserId,
      role: 'user',
      is_admin: false,
      password_hash: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('id').single();
    if (error || !inserted) {
      return jsonError(req, error?.message ?? 'Error al crear usuario', 500);
    }
    userId = inserted.id as number;
  }

  await upsertUserLink(supabase, supabaseUserId, userId);

  const token = await signArcusxJwt({ userId, username, email }, 3600 * 24);

  return jsonSuccess(req, {
    token,
    user: { id: userId, username, email },
    is_new_user: isNewUser,
    referral: null,
  });
}

export async function registerWallet(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);
  const wallet = String(ctx.body.wallet_address ?? '').trim();
  if (!isValidStellarG(wallet)) {
    return jsonError(req, 'La dirección de wallet Stellar no es válida.', 400);
  }

  const { data: row } = await auth.supabase
    .from('arcusx_users')
    .select('wallet_address')
    .eq('id', auth.userId)
    .single();

  if (row?.wallet_address) {
    return jsonSuccess(req, {
      message: 'Wallet ya registrada',
      wallet_address: row.wallet_address,
      already_registered: true,
    });
  }

  const { error } = await auth.supabase
    .from('arcusx_users')
    .update({ wallet_address: wallet, updated_at: new Date().toISOString() })
    .eq('id', auth.userId);

  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, { wallet_address: wallet });
}

export async function verifyWallet(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);
  const { data } = await auth.supabase
    .from('arcusx_users')
    .select('wallet_address')
    .eq('id', auth.userId)
    .single();

  const w = data?.wallet_address ?? null;
  return jsonResponse(req, {
    success: true,
    has_wallet: Boolean(w),
    wallet_address: w,
  });
}
