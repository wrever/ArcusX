import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import type { ApiContext } from './types.ts';
import { qpInt } from './types.ts';
import { requireUser } from './require.ts';
import { computeUserPublicStats, isPublicProfile, parseSkills } from './stats-helpers.ts';
import { normalizeDisplayText } from '../../_shared/text-encoding.ts';
import { loadUsersVerificationPublic } from '../../_shared/user-verification.ts';

export async function getUserDetails(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const userId = qpInt(url, 'user_id');
  if (!userId) return jsonError(req, 'user_id requerido', 400);

  const { data, error } = await supabase
    .from('arcusx_users')
    .select('id, username, email, avatar_url, bio, portfolio_url, wallet_address, private_payout_wallet, average_rating, total_ratings, skills, verified, public_profile, completed_tasks_count, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);
  if (!data) return jsonError(req, 'Usuario no encontrado', 404);
  return jsonResponse(req, { ...data, id: String(data.id) });
}

export async function getUserProfile(ctx: ApiContext): Promise<Response> {
  const { req, url, supabase, userId: currentUserId } = ctx;
  const profileUserId = qpInt(url, 'user_id');
  if (!profileUserId) return jsonError(req, 'user_id es requerido y debe ser válido', 400);

  const { data: user, error } = await supabase
    .from('arcusx_users')
    .select(
      'id, username, email, avatar_url, bio, portfolio_url, public_profile, created_at, average_rating, total_ratings, skills, account_type, kyc_status, wallet_address, private_payout_wallet, completed_tasks_count',
    )
    .eq('id', profileUserId)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);
  if (!user) return jsonError(req, 'Usuario no encontrado', 404);

  const isOwner = currentUserId === profileUserId;
  const isPublic = isPublicProfile(user.public_profile);
  if (!isPublic && !isOwner) {
    return jsonError(req, 'Este perfil es privado', 403);
  }

  const { data: portfolio } = await supabase
    .from('arcusx_user_portfolio')
    .select('id, title, description, image_url, project_url, category, created_at, updated_at')
    .eq('user_id', profileUserId)
    .order('created_at', { ascending: false })
    .limit(50);

  const verMap = await loadUsersVerificationPublic(supabase, [profileUserId]);
  const ver = verMap.get(profileUserId);

  const profile: Record<string, unknown> = {
    id: user.id,
    username: user.username,
    avatar_url: user.avatar_url,
    bio: normalizeDisplayText(user.bio as string | null),
    portfolio_url: user.portfolio_url,
    public_profile: isPublic,
    member_since: user.created_at,
    average_rating: user.average_rating != null ? Number(user.average_rating) : 0,
    total_ratings: user.total_ratings != null ? Number(user.total_ratings) : 0,
    portfolio: portfolio ?? [],
    skills: parseSkills(user.skills),
    verified: ver?.creator_verified ?? false,
    kyc_verified: ver?.creator_verified ?? false,
    kyc_status: ver?.kyc_status ?? user.kyc_status,
    display_name: ver?.creator_display_name ?? user.username,
    public_badges: ver?.public_badges ?? [],
  };
  if (isOwner) profile.email = user.email;

  return jsonResponse(req, { success: true, profile });
}

export async function updateUser(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const id = Number(body.id ?? auth.userId);
  if (id !== auth.userId) {
    return jsonError(req, 'Prohibido: No tienes permiso para editar este usuario.', 403);
  }

  const name = String(body.name ?? body.username ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');

  if (!name || !email) return jsonError(req, 'Nombre y email requeridos', 400);

  const { data: user } = await auth.supabase.from('arcusx_users').select('*').eq('id', id).single();
  if (!user) return jsonError(req, 'Usuario no encontrado', 404);

  const { data: emailDup } = await auth.supabase
    .from('arcusx_users')
    .select('id')
    .eq('email', email)
    .neq('id', id)
    .maybeSingle();
  if (emailDup) return jsonError(req, 'El correo electrónico ya está en uso por otro usuario', 400);

  const patch: Record<string, unknown> = {
    username: name,
    email,
    updated_at: new Date().toISOString(),
  };

  if (newPassword) {
    const { compare, hash } = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
    const stored = String(user.password_hash ?? '');
    if (!stored || !currentPassword) {
      return jsonError(req, 'La contraseña actual es incorrecta', 400);
    }
    const ok = await compare(currentPassword, stored);
    if (!ok) return jsonError(req, 'La contraseña actual es incorrecta', 400);
    patch.password_hash = await hash(newPassword);
  }

  const { error } = await auth.supabase.from('arcusx_users').update(patch).eq('id', id);
  if (error) return jsonError(req, error.message, 500);

  return jsonResponse(req, {
    message: 'Usuario actualizado correctamente',
    user: { id, username: name, email },
  });
}

export async function updateUserProfile(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields = ['username', 'bio', 'portfolio_url', 'public_profile', 'skills'] as const;
  for (const f of fields) {
    if (body[f] !== undefined) patch[f] = body[f];
  }

  const { error } = await auth.supabase.from('arcusx_users').update(patch).eq('id', auth.userId);
  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, { message: 'Perfil actualizado' });
}

export async function getUserPublicStats(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const userId = qpInt(url, 'user_id');
  if (!userId) return jsonError(req, 'user_id es requerido y debe ser válido', 400);

  const { data: exists } = await supabase
    .from('arcusx_users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (!exists) return jsonError(req, 'Usuario no encontrado', 404);

  const stats = await computeUserPublicStats(supabase, userId);
  return jsonResponse(req, { success: true, stats });
}

export { getFreelancers } from './freelancers-list.ts';
