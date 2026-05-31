import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { normalizePlatformFeeRate } from '../../_shared/platform-fee.ts';
import { insertArcusxNotification } from '../../_shared/arcusx-notifications.ts';
import type { ApiContext } from './types.ts';
import { qp, qpInt } from './types.ts';
import { requireUser } from './require.ts';
import { uploadTaskFile } from './storage-helpers.ts';
import { normalizeDisplayText } from '../../_shared/text-encoding.ts';

const ALLOWED_CURRENCIES = ['USDC'];
const ALLOWED_DIFFICULTIES = ['Fácil', 'Intermedio', 'Difícil', 'FÃ¡cil', 'Fácil '];
const ALLOWED_CATEGORIES = ['Desarrollo', 'Diseño', 'Marketing', 'Blockchain', 'Contenido'];

export async function getTasks(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const search = qp(url, 'search');
  const minPrice = url.searchParams.get('min_price');
  const maxPrice = url.searchParams.get('max_price');
  const category = qp(url, 'category');
  const difficulty = qp(url, 'difficulty');
  const sortBy = qp(url, 'sort_by') || 'date_desc';

  let q = supabase
    .from('arcusx_tasks')
    .select(`
      id, title, subtitle, description, price, currency, difficulty, category,
      created_at, status, user_id,
      arcusx_users!arcusx_tasks_user_id_fkey (
        id, username, average_rating, total_ratings
      )
    `)
    .eq('status', 'open')
    .is('accepted_applicant_id', null)
    .or('is_private_invite.eq.false,is_private_invite.is.null');

  if (search) {
    q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (minPrice) q = q.gte('price', Number(minPrice));
  if (maxPrice) q = q.lte('price', Number(maxPrice));
  if (category && category !== 'all') q = q.ilike('category', category);
  if (difficulty && difficulty !== 'all') q = q.ilike('difficulty', difficulty);

  switch (sortBy) {
    case 'price_asc':
      q = q.order('price', { ascending: true });
      break;
    case 'price_desc':
      q = q.order('price', { ascending: false });
      break;
    case 'date_asc':
      q = q.order('created_at', { ascending: true });
      break;
    default:
      q = q.order('created_at', { ascending: false });
  }

  const { data, error } = await q;
  if (error) return jsonError(req, error.message, 500);

  const tasks = (data ?? []).map((row) => {
    const u = row.arcusx_users as Record<string, unknown> | null;
    return {
      id: row.id,
      title: normalizeDisplayText(row.title as string),
      subtitle: normalizeDisplayText(row.subtitle as string),
      description: normalizeDisplayText(row.description as string),
      price: row.price,
      currency: normalizeDisplayText(row.currency as string),
      difficulty: normalizeDisplayText(row.difficulty as string),
      category: normalizeDisplayText(row.category as string),
      creator_username: normalizeDisplayText(u?.username ?? ''),
      creator_id: u?.id ?? row.user_id,
      creator_rating: u?.average_rating ?? null,
      creator_total_ratings: u?.total_ratings ?? null,
      created_at: row.created_at,
      status: row.status,
      proposal_count: 0,
    };
  });

  return jsonResponse(req, tasks);
}

export async function getTaskDetails(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const taskId = qpInt(url, 'task_id');
  if (!taskId) return jsonError(req, 'task_id es requerido', 400);

  const { data: task, error } = await supabase
    .from('arcusx_tasks')
    .select(`
      id, title, subtitle, description, price, currency, difficulty, category,
      created_at, user_id, status, client_accepted_completion, worker_accepted_completion,
      files, escrow_id, escrow_status, escrow_created_at, escrow_completed_at,
      accepted_applicant_id,
      arcusx_users!arcusx_tasks_user_id_fkey (username)
    `)
    .eq('id', taskId)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);
  if (!task) return jsonError(req, 'Tarea no encontrada', 404);

  const creator = task.arcusx_users as { username?: string } | null;
  let files: unknown[] = [];
  if (task.files) {
    files = typeof task.files === 'string' ? JSON.parse(task.files) : task.files;
    if (!Array.isArray(files)) files = [];
  }

  let workerWallet: string | null = null;
  let workerUsername: string | null = null;
  if (task.accepted_applicant_id) {
    const { data: app } = await supabase
      .from('arcusx_applications')
      .select('worker_wallet_address')
      .eq('task_id', taskId)
      .eq('applicant_id', task.accepted_applicant_id)
      .eq('status', 'accepted')
      .maybeSingle();
    workerWallet = app?.worker_wallet_address ?? null;

    const { data: worker } = await supabase
      .from('arcusx_users')
      .select('username, private_payout_wallet, wallet_address')
      .eq('id', task.accepted_applicant_id)
      .maybeSingle();
    if (!workerWallet) {
      const payout = String(worker?.private_payout_wallet ?? '').trim();
      workerWallet = payout || (worker?.wallet_address ?? null);
    }
    workerUsername = worker?.username ?? null;
  }

  const canMarkCompleted = Number(task.worker_accepted_completion ?? 0) === 0;

  return jsonResponse(req, {
    success: true,
    id: task.id,
    title: normalizeDisplayText(task.title as string),
    subtitle: normalizeDisplayText(task.subtitle as string),
    description: normalizeDisplayText(task.description as string),
    price: task.price,
    currency: normalizeDisplayText(task.currency as string),
    difficulty: normalizeDisplayText(task.difficulty as string),
    category: normalizeDisplayText(task.category as string),
    user_id: String(task.user_id),
    status: task.status ?? 'active',
    client_accepted_completion: Number(task.client_accepted_completion ?? 0),
    worker_accepted_completion: Number(task.worker_accepted_completion ?? 0),
    creator_username: normalizeDisplayText(creator?.username ?? ''),
    created_at: task.created_at,
    files,
    escrow_id: task.escrow_id ?? null,
    escrow_status: task.escrow_status ?? 'pending',
    escrow_created_at: task.escrow_created_at ?? null,
    escrow_completed_at: task.escrow_completed_at ?? null,
    accepted_applicant_id: task.accepted_applicant_id ? String(task.accepted_applicant_id) : null,
    worker_wallet_address: workerWallet,
    worker_username: workerUsername,
    can_mark_completed: canMarkCompleted,
  });
}

export async function uploadTaskDetailsFile(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const taskId = qpInt(url, 'task_id');
  if (!taskId) return jsonError(req, 'task_id es requerido', 400);

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return jsonError(req, 'No se envió archivo válido', 400);
  }

  try {
    const newFile = await uploadTaskFile(supabase, taskId, file);
    const { data: task } = await supabase.from('arcusx_tasks').select('files').eq('id', taskId).single();
    let current: unknown[] = [];
    if (task?.files) {
      current = typeof task.files === 'string' ? JSON.parse(task.files) : task.files;
      if (!Array.isArray(current)) current = [];
    }
    current.push(newFile);

    const { error } = await supabase.from('arcusx_tasks').update({
      files: current,
      updated_at: new Date().toISOString(),
    }).eq('id', taskId);
    if (error) return jsonError(req, error.message, 500);

    return jsonSuccess(req, { message: 'Archivo subido exitosamente', file: newFile });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al subir archivo';
    return jsonError(req, msg, 500);
  }
}

export async function deleteTaskDetailsFile(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url, body } = ctx;
  const taskId = qpInt(url, 'task_id');
  const fileId = String(body.file_id ?? '');
  if (!taskId || !fileId) return jsonError(req, 'file_id es requerido', 400);

  const { data: task } = await supabase.from('arcusx_tasks').select('files').eq('id', taskId).single();
  if (!task) return jsonError(req, 'Tarea no encontrada', 404);

  let current: Array<{ id?: string; filename?: string }> = [];
  if (task.files) {
    current = typeof task.files === 'string' ? JSON.parse(task.files) : task.files;
    if (!Array.isArray(current)) current = [];
  }

  const next = current.filter((f) => f.id !== fileId);
  if (next.length === current.length) return jsonError(req, 'Archivo no encontrado', 404);

  const { error } = await supabase.from('arcusx_tasks').update({
    files: next,
    updated_at: new Date().toISOString(),
  }).eq('id', taskId);
  if (error) return jsonError(req, error.message, 500);

  return jsonSuccess(req, { message: 'Archivo eliminado exitosamente' });
}

export async function createTask(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const userId = Number(body.user_id);
  if (userId !== auth.userId) {
    return jsonError(req, 'Forbidden: user_id does not match authenticated user', 403, 'user_id_mismatch');
  }

  const title = String(body.title ?? '');
  const subtitle = String(body.subtitle ?? '');
  const description = String(body.description ?? '');
  const price = Number(body.price);
  const currency = String(body.currency ?? 'USDC');
  const difficulty = String(body.difficulty ?? '');
  const category = String(body.category ?? '');

  if (!title || !description || !price || price <= 0) {
    return jsonError(req, 'Missing required fields', 400, 'missing_fields');
  }
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    return jsonError(req, 'Valores inválidos en moneda, dificultad o categoría.', 400);
  }

  const isPrivate = body.is_private_invite === true || body.is_private_invite === 1 || body.is_private_invite === '1';
  let invitedUserId: number | null = null;
  if (isPrivate) {
    invitedUserId = Number(body.invited_user_id);
    if (!invitedUserId || invitedUserId === auth.userId) {
      return jsonError(req, 'invited_user_id inválido o igual al creador.', 400);
    }
    const { data: invited } = await auth.supabase
      .from('arcusx_users')
      .select('id, private_payout_wallet, wallet_address')
      .eq('id', invitedUserId)
      .maybeSingle();
    if (!invited) return jsonError(req, 'El freelancer invitado no existe.', 404);
    const payout = String(invited.private_payout_wallet ?? invited.wallet_address ?? '').trim();
    const STELLAR_G = /^G[A-Z0-9]{55}$/;
    if (!STELLAR_G.test(payout)) {
      return jsonError(req, 'El freelancer invitado no tiene wallet de cobro registrada para ofertas privadas.', 400);
    }
  }

  const insertRow: Record<string, unknown> = {
    title,
    subtitle,
    description,
    price,
    currency,
    difficulty,
    category,
    user_id: auth.userId,
    status: 'open',
    is_private_invite: isPrivate,
    invited_user_id: isPrivate ? invitedUserId : null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await auth.supabase.from('arcusx_tasks').insert(insertRow).select('id').single();
  if (error) return jsonError(req, error.message, 500);

  const { data: userRow } = await auth.supabase
    .from('arcusx_users')
    .select('tasks_today, tasks_this_week')
    .eq('id', auth.userId)
    .single();

  const cooldownUntil = new Date(Date.now() + 7200 * 1000).toISOString();
  await auth.supabase.from('arcusx_users').update({
    tasks_today: Number(userRow?.tasks_today ?? 0) + 1,
    tasks_this_week: Number(userRow?.tasks_this_week ?? 0) + 1,
    cooldown_until: cooldownUntil,
    last_task_created: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', auth.userId);

  return jsonSuccess(req, { task_id: data?.id, message: 'Tarea creada exitosamente' });
}

export async function getTaskProposals(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const taskId = qpInt(url, 'task_id');
  if (!taskId) return jsonError(req, 'ID de tarea requerido.', 400);

  const { data, error } = await supabase
    .from('arcusx_applications')
    .select(`
      id, task_id, applicant_id, message, portfolio_url, worker_wallet_address, created_at, status,
      arcusx_users!arcusx_applications_applicant_id_fkey (username, email)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) return jsonError(req, error.message, 500);

  const proposals = (data ?? []).map((row) => {
    const u = row.arcusx_users as { username?: string; email?: string } | null;
    return {
      id: row.id,
      task_id: row.task_id,
      applicant_id: row.applicant_id,
      message: row.message,
      portfolio_url: row.portfolio_url,
      worker_wallet_address: row.worker_wallet_address,
      created_at: row.created_at,
      status: row.status ?? 'pending',
      applicant_username: u?.username ?? '',
      applicant_email: u?.email ?? '',
    };
  });

  return jsonResponse(req, proposals);
}

export async function applyTask(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.taskId);
  const message = String(body.message ?? '').trim();
  const wallet = String(body.walletAddress ?? '').trim();
  const applicantId = body.applicantId ? Number(body.applicantId) : auth.userId;

  if (applicantId !== auth.userId) {
    return jsonError(req, 'Forbidden: applicantId does not match authenticated user', 403);
  }
  if (!taskId || !message || !wallet) {
    return jsonError(req, 'Missing required fields', 400, 'missing_fields');
  }

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, title, user_id, status, accepted_applicant_id, is_private_invite, invited_user_id')
    .eq('id', taskId)
    .single();

  if (!task || task.status !== 'open' || task.accepted_applicant_id) {
    return jsonError(req, 'La tarea no está disponible para postulaciones', 400);
  }

  if (task.is_private_invite) {
    const invitedId = Number(task.invited_user_id);
    if (!invitedId || invitedId !== auth.userId) {
      return jsonError(req, 'Solo el freelancer invitado puede postular a esta oferta privada', 403);
    }
  }

  const { error } = await auth.supabase.from('arcusx_applications').upsert({
    task_id: taskId,
    applicant_id: auth.userId,
    message,
    worker_wallet_address: wallet,
    portfolio_url: body.portfolioUrl ? String(body.portfolioUrl) : null,
    status: 'pending',
    created_at: new Date().toISOString(),
  }, { onConflict: 'task_id,applicant_id' });

  if (error) return jsonError(req, error.message, 500);

  const ownerId = Number(task.user_id);
  if (ownerId && ownerId !== auth.userId) {
    const { data: applicant } = await auth.supabase
      .from('arcusx_users')
      .select('username')
      .eq('id', auth.userId)
      .maybeSingle();
    const who = applicant?.username ?? 'Un freelancer';
    const title = String(task.title ?? 'tu tarea');
    await insertArcusxNotification(auth.supabase, {
      user_id_mysql: ownerId,
      title: 'Nueva propuesta',
      message: `${who} se postuló a "${title}". Revisa las propuestas en tu panel.`,
      type: 'info',
    });
  }

  return jsonSuccess(req, { message: 'Postulación enviada correctamente' });
}

export async function getUserTasks(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const userId = qpInt(url, 'user_id') ?? auth.userId;
  if (userId !== auth.userId) return jsonError(req, 'Forbidden', 403);

  const { data: tasks, error } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, title, subtitle, price, currency, difficulty, category, created_at, user_id, accepted_applicant_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return jsonError(req, error.message, 500);
  const rows = tasks ?? [];
  const taskIds = rows.map((t) => t.id as number);
  if (taskIds.length === 0) return jsonResponse(req, []);

  const { data: apps } = await auth.supabase
    .from('arcusx_applications')
    .select('task_id, status, applicant_id')
    .in('task_id', taskIds);

  const out = rows.map((t) => {
    const related = (apps ?? []).filter((a) => a.task_id === t.id);
    const accepted = related.find((a) => a.status === 'accepted');
    return {
      id: t.id,
      title: normalizeDisplayText(t.title as string),
      subtitle: normalizeDisplayText(t.subtitle as string),
      price: t.price,
      currency: normalizeDisplayText(t.currency as string),
      difficulty: normalizeDisplayText(t.difficulty as string),
      category: normalizeDisplayText(t.category as string),
      created_at: t.created_at,
      proposal_count: related.length,
      has_accepted_proposal: Boolean(accepted),
      accepted_applicant_id: accepted?.applicant_id ?? t.accepted_applicant_id ?? null,
    };
  });

  return jsonResponse(req, out);
}

export async function getAcceptedTasks(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const userId = qpInt(url, 'user_id') ?? auth.userId;
  if (userId !== auth.userId) return jsonError(req, 'Forbidden', 403);

  const { data, error } = await auth.supabase
    .from('arcusx_tasks')
    .select(`
      id, title, subtitle, description, price, currency, difficulty, category, created_at,
      accepted_applicant_id,
      arcusx_users!arcusx_tasks_user_id_fkey (
        id, username, average_rating, total_ratings
      )
    `)
    .eq('accepted_applicant_id', userId)
    .order('created_at', { ascending: false });

  if (error) return jsonError(req, error.message, 500);

  const out = (data ?? []).map((row) => {
    const creator = row.arcusx_users as {
      id?: number;
      username?: string;
      average_rating?: number;
      total_ratings?: number;
    } | null;
    return {
      id: row.id,
      title: normalizeDisplayText(row.title as string),
      subtitle: normalizeDisplayText(row.subtitle as string),
      description: normalizeDisplayText(row.description as string),
      price: row.price,
      currency: normalizeDisplayText(row.currency as string),
      difficulty: normalizeDisplayText(row.difficulty as string),
      category: normalizeDisplayText(row.category as string),
      created_at: row.created_at,
      accepted_applicant_id: row.accepted_applicant_id,
      creator_id: creator?.id ?? null,
      creator_username: normalizeDisplayText(creator?.username ?? ''),
      creator_rating: creator?.average_rating != null ? Number(creator.average_rating) : null,
      creator_total_ratings: creator?.total_ratings != null ? Number(creator.total_ratings) : null,
    };
  });

  return jsonResponse(req, out);
}

export async function getCompletedTasksCount(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const { data: userRow, error: userErr } = await auth.supabase
    .from('arcusx_users')
    .select('completed_tasks_count')
    .eq('id', auth.userId)
    .maybeSingle();

  if (userErr) return jsonError(req, userErr.message, 500);

  let completed = Number(userRow?.completed_tasks_count ?? 0);
  if (!Number.isFinite(completed) || completed < 0) completed = 0;

  if (completed === 0) {
    const { count, error } = await auth.supabase
      .from('arcusx_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('accepted_applicant_id', auth.userId)
      .eq('status', 'completed')
      .eq('escrow_status', 'completed');
    if (error) return jsonError(req, error.message, 500);
    completed = count ?? 0;
  }

  return jsonResponse(req, {
    success: true,
    completed_tasks_count: completed,
    count: completed,
  });
}

export async function getLandingMarketStats(ctx: ApiContext): Promise<Response> {
  const { req, supabase } = ctx;
  const [{ count: openTasks }, { count: totalUsers }, { data: volRows }] = await Promise.all([
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true })
      .eq('status', 'open').is('accepted_applicant_id', null),
    supabase.from('arcusx_users').select('*', { count: 'exact', head: true }),
    supabase.from('arcusx_tasks').select('price')
      .eq('status', 'completed').eq('escrow_status', 'completed'),
  ]);

  const totalVolume = (volRows ?? []).reduce((s, r) => s + Number(r.price ?? 0), 0);
  return jsonSuccess(req, {
    open_tasks: openTasks ?? 0,
    total_users: totalUsers ?? 0,
    total_volume_usdc: Math.round(totalVolume),
  });
}

export async function getPlatformFee(ctx: ApiContext): Promise<Response> {
  const { req, supabase } = ctx;
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  const platformFee = normalizePlatformFeeRate(data?.config_value);
  return jsonResponse(req, {
    success: true,
    platform_fee: platformFee,
    platform_fee_percent: Math.round(platformFee * 10000) / 100,
  });
}

export async function taskStats(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const userId = qpInt(url, 'user_id') ?? auth.userId;
  if (userId !== auth.userId) return jsonError(req, 'Forbidden', 403);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  const day = weekStart.getUTCDay();
  weekStart.setUTCDate(weekStart.getUTCDate() - (day === 0 ? 6 : day - 1));

  const [{ count: tasksToday }, { count: tasksThisWeek }, { data: user }] = await Promise.all([
    auth.supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', today.toISOString()),
    auth.supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', weekStart.toISOString()),
    auth.supabase.from('arcusx_users').select('cooldown_until').eq('id', userId).single(),
  ]);

  const tasksTodayN = tasksToday ?? 0;
  const tasksWeekN = tasksThisWeek ?? 0;
  let canCreate = tasksTodayN < 5 && tasksWeekN < 50;
  let cooldownRemaining = 0;
  let nextTaskTime = 'Ahora';

  if (user?.cooldown_until) {
    const until = new Date(user.cooldown_until).getTime();
    if (until > Date.now()) {
      canCreate = false;
      cooldownRemaining = Math.floor((until - Date.now()) / 1000);
      nextTaskTime = user.cooldown_until;
    }
  }

  return jsonResponse(req, {
    success: true,
    tasks_today: tasksTodayN,
    tasks_this_week: tasksWeekN,
    can_create: canCreate,
    cooldown_remaining: cooldownRemaining,
    next_task_time: canCreate ? 'Ahora' : nextTaskTime,
  });
}
