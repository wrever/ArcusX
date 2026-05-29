import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { bearerToken, type AuthContext } from './auth.ts';
import { requireAdminWallet } from './auth.ts';

function supabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function isUserInAdminTable(userId: string): Promise<boolean> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('arcusx_admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error?.code === '42P01') return false;
  if (error) return false;
  return !!data;
}

function isUserIdInEnvAllowlist(userId: string): boolean {
  const raw = Deno.env.get('ESCROW_ADMIN_USER_IDS') ?? '';
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

/**
 * Admin Supabase: JWT válido + (tabla arcusx_admin_users | ESCROW_ADMIN_USER_IDS | app_metadata.admin).
 * Para resolve-dispute on-chain además se exige admin_wallet en ARCUSX_ADMIN_WALLETS.
 */
export async function requireSupabaseAdmin(req: Request): Promise<AuthContext> {
  const token = bearerToken(req);
  if (!token) throw new Error('Authorization Bearer requerido');

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Token inválido o expirado');
  }

  const userId = data.user.id;
  const appAdmin = data.user.app_metadata?.role === 'admin' ||
    data.user.app_metadata?.is_admin === true;

  if (!appAdmin && !isUserIdInEnvAllowlist(userId) &&
    !(await isUserInAdminTable(userId))) {
    throw new Error('No autorizado: se requiere rol administrador');
  }

  return {
    userId,
    email: data.user.email,
  };
}

export async function requireSupabaseAdminAndWallet(
  req: Request,
  adminWallet: string,
): Promise<AuthContext> {
  const ctx = await requireSupabaseAdmin(req);
  requireAdminWallet(adminWallet);
  return ctx;
}
