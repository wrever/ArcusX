import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import type { ApiContext } from './types.ts';
import { qpInt } from './types.ts';
import { requireUser } from './require.ts';

export async function getUserDetails(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const userId = qpInt(url, 'user_id');
  if (!userId) return jsonError(req, 'user_id requerido', 400);

  const { data, error } = await supabase
    .from('arcusx_users')
    .select('id, username, email, avatar_url, bio, portfolio_url, wallet_address, average_rating, total_ratings, skills, verified, public_profile, completed_tasks_count, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);
  if (!data) return jsonError(req, 'Usuario no encontrado', 404);
  return jsonResponse(req, { ...data, id: String(data.id) });
}

export async function getUserProfile(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const userId = qpInt(url, 'user_id') ?? auth.userId;

  const { data, error } = await auth.supabase
    .from('arcusx_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return jsonError(req, error.message, 500);
  return jsonResponse(req, { success: true, profile: data });
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
  if (!userId) return jsonError(req, 'user_id requerido', 400);

  const { data: user } = await supabase
    .from('arcusx_users')
    .select('id, username, avatar_url, average_rating, total_ratings, completed_tasks_count, created_at')
    .eq('id', userId)
    .single();

  const { count: completed } = await supabase
    .from('arcusx_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('accepted_applicant_id', userId)
    .eq('status', 'completed');

  return jsonResponse(req, {
    success: true,
    stats: {
      ...user,
      tasks_completed: completed ?? 0,
    },
  });
}

export async function getFreelancers(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const page = Math.max(1, qpInt(url, 'page') ?? 1);
  const limit = Math.min(100, Math.max(1, qpInt(url, 'limit') ?? 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('arcusx_users')
    .select('id, username, avatar_url, bio, skills, average_rating, total_ratings, completed_tasks_count, created_at', { count: 'exact' })
    .eq('public_profile', true)
    .order('average_rating', { ascending: false })
    .range(from, to);

  if (error) return jsonError(req, error.message, 500);
  return jsonResponse(req, {
    success: true,
    freelancers: data ?? [],
    pagination: { page, limit, total: count ?? 0 },
  });
}
