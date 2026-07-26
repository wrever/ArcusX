import type { SupabaseClient, User } from '@supabase/supabase-js';
import { supabaseService } from './referral-db.ts';
import { bearerToken, verifyArcusxJwt, type ArcusxJwtPayload } from './arcusx-jwt.ts';
import { isPartnerApiKey } from './partner-api-keys.ts';

export type AuthContext = {
  supabase: SupabaseClient;
  userId: number;
  supabaseUserId?: string;
  jwt?: ArcusxJwtPayload;
};

export async function verifySupabaseAccessToken(
  accessToken: string,
  expectedUserId: string,
  expectedEmail: string,
): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('ARCUSX_SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('ARCUSX_SUPABASE_ANON_KEY');
  if (!url || !anon) return false;

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anon,
    },
  });
  if (!res.ok) return false;
  const user = await res.json() as { id?: string; email?: string };
  if (user.id !== expectedUserId) return false;
  const email = (user.email ?? '').toLowerCase();
  return email === expectedEmail.toLowerCase();
}

export async function resolveMysqlUserId(
  supabase: SupabaseClient,
  opts: { supabaseUserId?: string; arcusxJwt?: ArcusxJwtPayload },
): Promise<number | null> {
  if (opts.arcusxJwt?.userId) return opts.arcusxJwt.userId;

  if (opts.supabaseUserId) {
    const { data: link } = await supabase
      .from('arcusx_user_link')
      .select('mysql_user_id')
      .eq('supabase_user_id', opts.supabaseUserId)
      .maybeSingle();
    if (link?.mysql_user_id) return link.mysql_user_id as number;

    const { data: user } = await supabase
      .from('arcusx_users')
      .select('id')
      .eq('supabase_user_id', opts.supabaseUserId)
      .maybeSingle();
    if (user?.id) return user.id as number;
  }

  return null;
}

export async function authenticateRequest(req: Request): Promise<{
  supabase: SupabaseClient;
  userId: number | null;
  supabaseUserId?: string;
  jwt?: ArcusxJwtPayload;
}> {
  const supabase = supabaseService();
  const token = bearerToken(req);
  if (!token) {
    return { supabase, userId: null };
  }

  // Bearer axk_* = partner API key (estilo Soroswap), no JWT de usuario
  if (isPartnerApiKey(token)) {
    return { supabase, userId: null };
  }

  const jwt = await verifyArcusxJwt(token);
  if (jwt) {
    return { supabase, userId: jwt.userId, jwt };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (!error && user) {
    const userId = await resolveMysqlUserId(supabase, { supabaseUserId: user.id });
    return { supabase, userId, supabaseUserId: user.id };
  }

  return { supabase, userId: null };
}

export async function requireUser(req: Request): Promise<AuthContext> {
  const auth = await authenticateRequest(req);
  if (auth.userId == null) {
    throw new Error('Unauthorized');
  }
  return {
    supabase: auth.supabase,
    userId: auth.userId,
    supabaseUserId: auth.supabaseUserId,
    jwt: auth.jwt,
  };
}

export async function requireAdmin(req: Request): Promise<AuthContext> {
  const auth = await requireUser(req);
  const { data: row } = await auth.supabase
    .from('arcusx_users')
    .select('is_admin, role')
    .eq('id', auth.userId)
    .single();

  const isAdmin = row?.is_admin === true || row?.role === 'admin' || auth.jwt?.isAdmin;
  if (!isAdmin) throw new Error('Forbidden: admin required');
  return auth;
}

export async function upsertUserLink(
  supabase: SupabaseClient,
  supabaseUserId: string,
  mysqlUserId: number,
): Promise<void> {
  await supabase.from('arcusx_user_link').upsert({
    supabase_user_id: supabaseUserId,
    mysql_user_id: mysqlUserId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'supabase_user_id' });
}
