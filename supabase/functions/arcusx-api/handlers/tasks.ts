import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { normalizePlatformFeeRate, TRUSTLESS_WORK_PROTOCOL_FEE } from '../../_shared/platform-fee.ts';
import { quoteBilateralFromNominal } from '../../_shared/bilateral-fee.ts';
import { stellarNetworkApiLabel } from '../../_shared/stellar-network.ts';
import { insertArcusxNotification } from '../../_shared/arcusx-notifications.ts';
import type { ApiContext } from './types.ts';
import { qp, qpInt } from './types.ts';
import { requireUser } from './require.ts';
import { uploadTaskFile } from './storage-helpers.ts';
import { normalizeDisplayText } from '../../_shared/text-encoding.ts';
import { creatorDisplayFields } from '../../_shared/creator-display.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import { emitPartnerWebhook } from '../../_shared/partner-webhooks.ts';
import { loadCreatorEnrichment } from './kyc.ts';
import { ensureTaskScheduledDeletion } from '../../_shared/task-purge.ts';
import { loadReleasedVolumeRows, sumVolumeRows } from '../../_shared/admin-stats.ts';
import { getOauthUserCount } from '../../_shared/oauth-user-stats.ts';

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
      created_at, status, user_id, stellar_network,
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

  const creatorIds = (data ?? []).map((row) => Number(row.user_id));
  const enrichment = await loadCreatorEnrichment(supabase, creatorIds);

  const tasks = (data ?? []).map((row) => {
    const u = row.arcusx_users as Record<string, unknown> | null;
    const uid = Number(row.user_id);
    const box = enrichment.get(uid);
    const display = creatorDisplayFields(
      box?.user ?? u,
      box?.enterpriseProfile ?? null,
      box?.individualProfile ?? null,
    );
    return {
      id: row.id,
      title: normalizeDisplayText(row.title as string),
      subtitle: normalizeDisplayText(row.subtitle as string),
      description: normalizeDisplayText(row.description as string),
      price: row.price,
      currency: normalizeDisplayText(row.currency as string),
      difficulty: normalizeDisplayText(row.difficulty as string),
      category: normalizeDisplayText(row.category as string),
      creator_username: normalizeDisplayText(display.creator_username),
      creator_display_name: normalizeDisplayText(display.creator_display_name),
      creator_verified: display.creator_verified,
      creator_verified_enterprise: display.creator_verified_enterprise,
      creator_verified_individual: display.creator_verified_individual,
      creator_id: u?.id ?? row.user_id,
      creator_rating: u?.average_rating ?? null,
      creator_total_ratings: u?.total_ratings ?? null,
      created_at: row.created_at,
      status: row.status,
      stellar_network: row.stellar_network === 'mainnet' ? 'mainnet' : 'testnet',
      proposal_count: 0,
    };
  });

  return jsonResponse(req, tasks);
}

export async function getTaskDetails(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url, userId } = ctx;
  const taskId = qpInt(url, 'task_id');
  if (!taskId) return jsonError(req, 'task_id es requerido', 400);

  const { data: task, error } = await supabase
    .from('arcusx_tasks')
    .select(`
      id, title, subtitle, description, price, currency, difficulty, category,
      created_at, user_id, status, client_accepted_completion, worker_accepted_completion,
      files, escrow_id, escrow_status, escrow_created_at, escrow_completed_at,
      escrow_deploy_tx_hash, escrow_fund_tx_hash, escrow_release_tx_hash,
      escrow_amount, escrow_platform_fee, worker_started_at,
      accepted_applicant_id, escrow_pending_proposal_id,
      is_private_invite, invited_user_id,
      scheduled_deletion_at, completed_at, cancellation_requested_at,
      arcusx_users!arcusx_tasks_user_id_fkey (username)
    `)
    .eq('id', taskId)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);
  if (!task) return jsonError(req, 'Tarea no encontrada', 404);

  if (task.is_private_invite) {
    const invitedId = Number(task.invited_user_id);
    const ownerId = Number(task.user_id);
    const workerId = Number(task.accepted_applicant_id);
    const viewerId = userId != null ? Number(userId) : null;
    const allowed =
      viewerId != null &&
      (viewerId === ownerId || viewerId === invitedId || viewerId === workerId);
    if (!allowed) {
      return jsonError(req, 'Oferta privada no disponible', 403);
    }
  }

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

  const { scheduled_deletion_at: ensuredDeletionAt, dispute_resolved_at: disputeResolvedAt } =
    await ensureTaskScheduledDeletion(supabase, {
      id: Number(task.id),
      status: task.status,
      escrow_status: task.escrow_status,
      scheduled_deletion_at: task.scheduled_deletion_at,
      completed_at: task.completed_at,
      escrow_completed_at: task.escrow_completed_at,
      escrow_release_tx_hash: task.escrow_release_tx_hash,
      cancellation_requested_at: task.cancellation_requested_at,
    });

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
    escrow_pending_proposal_id: task.escrow_pending_proposal_id ?? null,
    escrow_fund_tx_hash: task.escrow_fund_tx_hash ?? null,
    escrow_release_tx_hash: task.escrow_release_tx_hash ?? null,
    escrow_amount: task.escrow_amount ?? null,
    escrow_platform_fee: task.escrow_platform_fee ?? null,
    worker_started_at: task.worker_started_at ?? null,
    is_private_invite: Boolean(task.is_private_invite),
    invited_user_id: task.invited_user_id ?? null,
    scheduled_deletion_at: ensuredDeletionAt ?? task.scheduled_deletion_at ?? null,
    completed_at: task.completed_at ?? null,
    dispute_resolved_at: disputeResolvedAt,
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

    const patch: Record<string, unknown> = {
      files: current,
      updated_at: new Date().toISOString(),
      cancellation_allowed: false,
    };
    const { error } = await supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
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

  const patch: Record<string, unknown> = {
    files: next,
    updated_at: new Date().toISOString(),
    cancellation_allowed: next.length === 0,
  };
  const { error } = await supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
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

  if (ctx.partnerId) insertRow.partner_id = ctx.partnerId;
  const externalId = body.external_id ? String(body.external_id).trim() : '';
  if (externalId) insertRow.external_id = externalId;

  const { data, error } = await auth.supabase.from('arcusx_tasks').insert(insertRow).select('id').single();
  if (error) return jsonError(req, error.message, 500);

  /* Oferta privada: notificación al freelancer solo tras fondear (finalize_private_offer). */

  const { data: userRow } = await auth.supabase
    .from('arcusx_users')
    .select('tasks_today, tasks_this_week, is_admin, role')
    .eq('id', auth.userId)
    .single();

  const isAdmin = userRow?.is_admin === true || userRow?.role === 'admin';
  const patch: Record<string, unknown> = {
    tasks_today: Number(userRow?.tasks_today ?? 0) + 1,
    tasks_this_week: Number(userRow?.tasks_this_week ?? 0) + 1,
    last_task_created: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!isAdmin) {
    patch.cooldown_until = new Date(Date.now() + 7200 * 1000).toISOString();
  }
  await auth.supabase.from('arcusx_users').update(patch).eq('id', auth.userId);

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: data?.id ?? 0,
    event_type: 'task.created',
    actor_user_id: auth.userId,
    payload: { is_private: isPrivate, price },
  });

  void emitPartnerWebhook(auth.supabase, ctx.partnerId, 'task.created', {
    task_id: data?.id,
    external_id: externalId || null,
    partner_id: ctx.partnerId,
    price,
    is_private_invite: isPrivate,
  });

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
  if (!/^G[A-Z0-9]{55}$/.test(wallet)) {
    return jsonError(req, 'walletAddress inválida', 400);
  }

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, title, user_id, status, accepted_applicant_id, is_private_invite, invited_user_id, escrow_id, escrow_status')
    .eq('id', taskId)
    .single();

  if (!task || task.accepted_applicant_id) {
    return jsonError(req, 'La tarea no está disponible para postulaciones', 400);
  }

  if (task.is_private_invite && task.escrow_id) {
    return jsonError(
      req,
      'Esta oferta privada ya está fondeada. Acepta o rechaza desde la pestaña Ofertas.',
      400,
    );
  }

  if (!['open', 'private_offer_pending'].includes(String(task.status ?? ''))) {
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
      email: false,
    });
  }

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'task.applied',
    actor_user_id: auth.userId,
    payload: { applicant_id: auth.userId },
  });

  return jsonSuccess(req, { message: 'Postulación enviada correctamente' });
}

export async function getUserTasks(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const userId = qpInt(url, 'user_id') ?? auth.userId;
  if (userId !== auth.userId) return jsonError(req, 'Forbidden', 403);

  const { data: tasks, error } = await auth.supabase
    .from('arcusx_tasks')
    .select(
      'id, title, subtitle, price, currency, difficulty, category, created_at, user_id, status, accepted_applicant_id, escrow_id, escrow_status, escrow_fund_tx_hash, escrow_release_tx_hash, is_private_invite, invited_user_id, scheduled_deletion_at, cancellation_tx_hash, cancellation_requested_at, escrow_completed_at, completed_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return jsonError(req, error.message, 500);
  const rows = tasks ?? [];
  const taskIds = rows.map((t) => t.id as number);
  if (taskIds.length === 0) return jsonResponse(req, []);

  const invitedIds = [
    ...new Set(
      rows
        .map((t) => Number(t.invited_user_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  const invitedById = new Map<number, string>();
  if (invitedIds.length > 0) {
    const { data: invitedUsers } = await auth.supabase
      .from('arcusx_users')
      .select('id, username')
      .in('id', invitedIds);
    for (const u of invitedUsers ?? []) {
      invitedById.set(Number(u.id), String(u.username ?? ''));
    }
  }

  const { data: apps } = await auth.supabase
    .from('arcusx_applications')
    .select('task_id, status, applicant_id')
    .in('task_id', taskIds);

  const repairedDeletion = new Map<
    number,
    {
      scheduled_deletion_at: string | null;
      escrow_completed_at: string | null;
      completed_at: string | null;
    }
  >();
  await Promise.all(
    rows
      .filter((t) => {
        const escrowSt = String(t.escrow_status ?? '').toLowerCase();
        const status = String(t.status ?? '').toLowerCase();
        const closedEscrow =
          escrowSt === 'refunded' ||
          escrowSt === 'resolved' ||
          escrowSt === 'completed';
        const closedStatus =
          status === 'cancelled' || status === 'completed' || status === 'resolved';
        return (
          Boolean(String(t.escrow_release_tx_hash ?? '').trim()) ||
          closedEscrow ||
          closedStatus ||
          Boolean(t.scheduled_deletion_at)
        );
      })
      .map(async (t) => {
        const ensured = await ensureTaskScheduledDeletion(auth.supabase, {
          id: Number(t.id),
          status: t.status,
          escrow_status: t.escrow_status,
          scheduled_deletion_at: t.scheduled_deletion_at,
          completed_at: t.completed_at,
          escrow_completed_at: t.escrow_completed_at,
          escrow_release_tx_hash: t.escrow_release_tx_hash,
          cancellation_requested_at: t.cancellation_requested_at,
        });
        repairedDeletion.set(Number(t.id), {
          scheduled_deletion_at: ensured.scheduled_deletion_at,
          escrow_completed_at:
            ensured.escrow_completed_at ?? t.escrow_completed_at ?? null,
          completed_at: ensured.completed_at ?? t.completed_at ?? null,
        });
      }),
  );

  const out = rows.map((t) => {
    const related = (apps ?? []).filter((a) => a.task_id === t.id);
    const accepted = related.find((a) => a.status === 'accepted');
    const escrowSt = String(t.escrow_status ?? '').toLowerCase();
    const hasFundTx = Boolean(String(t.escrow_fund_tx_hash ?? '').trim());
    const postFundingEscrow =
      Boolean(t.escrow_id) &&
      hasFundTx &&
      (escrowSt === 'active' ||
        escrowSt === 'disputed' ||
        escrowSt === 'completed' ||
        escrowSt === 'resolved' ||
        escrowSt === 'pending_dispute_resolution');
    const assignedId = t.accepted_applicant_id ?? accepted?.applicant_id ?? null;
    const invitedUserId = Number(t.invited_user_id);
    const isPrivateInvite = Boolean(t.is_private_invite);
    const taskStatus = String(t.status ?? '');
    const awaitingPrivateWorker =
      isPrivateInvite &&
      !assignedId &&
      taskStatus !== 'private_offer_rejected' &&
      taskStatus !== 'assigned' &&
      taskStatus !== 'in_progress' &&
      (taskStatus === 'private_offer_pending' || taskStatus === 'open');
    const taskId = Number(t.id);
    const repaired = repairedDeletion.get(taskId);
    const deletionAt =
      repaired?.scheduled_deletion_at ?? t.scheduled_deletion_at ?? null;
    const escrowCompletedAt =
      repaired?.escrow_completed_at ?? t.escrow_completed_at ?? null;
    const completedAt = repaired?.completed_at ?? t.completed_at ?? null;
    return {
      id: t.id,
      title: normalizeDisplayText(t.title as string),
      subtitle: normalizeDisplayText(t.subtitle as string),
      price: t.price,
      currency: normalizeDisplayText(t.currency as string),
      difficulty: normalizeDisplayText(t.difficulty as string),
      category: normalizeDisplayText(t.category as string),
      created_at: t.created_at,
      status: taskStatus,
      proposal_count: related.length,
      has_accepted_proposal: postFundingEscrow && Boolean(assignedId),
      accepted_applicant_id: assignedId,
      escrow_id: t.escrow_id ?? null,
      escrow_status: t.escrow_status ?? null,
      escrow_fund_tx_hash: t.escrow_fund_tx_hash ?? null,
      escrow_release_tx_hash: t.escrow_release_tx_hash ?? null,
      is_private_invite: isPrivateInvite,
      invited_user_id: Number.isFinite(invitedUserId) && invitedUserId > 0 ? invitedUserId : null,
      invited_worker_username:
        Number.isFinite(invitedUserId) && invitedUserId > 0
          ? invitedById.get(invitedUserId) ?? null
          : null,
      awaiting_private_worker: awaitingPrivateWorker,
      scheduled_deletion_at: deletionAt,
      cancellation_tx_hash: t.cancellation_tx_hash ?? null,
      cancellation_requested_at: t.cancellation_requested_at ?? null,
      escrow_completed_at: escrowCompletedAt,
      completed_at: completedAt,
    };
  });

  return jsonResponse(req, out);
}

/** Trabajador solo ve tareas con escrow fondeado (o disputa/cierre posterior). */
function workerCanAccessSupervision(row: {
  escrow_id?: string | null;
  escrow_status?: string | null;
  escrow_fund_tx_hash?: string | null;
}): boolean {
  const st = String(row.escrow_status ?? '').toLowerCase();
  if (!String(row.escrow_id ?? '').trim()) return false;
  if (st === 'pending_funding' || st === 'pending_signature' || st === 'pending') return false;
  if (st === 'active') return Boolean(String(row.escrow_fund_tx_hash ?? '').trim());
  return st === 'disputed' || st === 'completed' || st === 'resolved';
}

export async function getAcceptedTasks(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const userId = qpInt(url, 'user_id') ?? auth.userId;
  if (userId !== auth.userId) return jsonError(req, 'Forbidden', 403);

  const activeStatuses = ['assigned', 'in_progress', 'disputed', 'open'];

  const { data: byAssignment, error } = await auth.supabase
    .from('arcusx_tasks')
    .select(`
      id, title, subtitle, description, price, currency, difficulty, category, created_at,
      user_id, accepted_applicant_id, status, escrow_id, escrow_status, escrow_fund_tx_hash,
      arcusx_users!arcusx_tasks_user_id_fkey (
        id, username, average_rating, total_ratings
      )
    `)
    .eq('accepted_applicant_id', userId)
    .in('status', activeStatuses)
    .order('created_at', { ascending: false });

  if (error) return jsonError(req, error.message, 500);

  const { data: acceptedApps } = await auth.supabase
    .from('arcusx_applications')
    .select('task_id')
    .eq('applicant_id', userId)
    .eq('status', 'accepted');

  const seen = new Set((byAssignment ?? []).map((r) => r.id as number));
  const extraIds = (acceptedApps ?? [])
    .map((a) => a.task_id as number)
    .filter((id) => id && !seen.has(id));

  let extraRows: typeof byAssignment = [];
  if (extraIds.length > 0) {
    const { data: extra } = await auth.supabase
      .from('arcusx_tasks')
      .select(`
        id, title, subtitle, description, price, currency, difficulty, category, created_at,
        user_id, accepted_applicant_id, status, escrow_id, escrow_status, escrow_fund_tx_hash,
        arcusx_users!arcusx_tasks_user_id_fkey (
          id, username, average_rating, total_ratings
        )
      `)
      .in('id', extraIds)
      .in('status', activeStatuses);
    extraRows = extra ?? [];
  }

  const merged = [...(byAssignment ?? []), ...extraRows];

  for (const row of merged) {
    const taskId = row.id as number;
    const st = String(row.escrow_status ?? '').toLowerCase();
    const hasFundTx = Boolean(String(row.escrow_fund_tx_hash ?? '').trim());
    const needsAssign =
      !row.accepted_applicant_id &&
      row.escrow_id &&
      st === 'active' &&
      hasFundTx;
    if (!needsAssign) continue;

    let fixApplicantId: number | null = null;
    let fixProposalId: number | null = null;

    const { data: fixApp } = await auth.supabase
      .from('arcusx_applications')
      .select('id, applicant_id')
      .eq('task_id', taskId)
      .eq('applicant_id', userId)
      .in('status', ['accepted', 'pending'])
      .order('status', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (fixApp?.applicant_id) {
      fixApplicantId = Number(fixApp.applicant_id);
      fixProposalId = Number(fixApp.id);
    }

    if (!fixApplicantId) {
      const { data: taskRow } = await auth.supabase
        .from('arcusx_tasks')
        .select('escrow_pending_proposal_id')
        .eq('id', taskId)
        .maybeSingle();
      const pendingId = taskRow?.escrow_pending_proposal_id;
      if (pendingId) {
        const { data: pendingApp } = await auth.supabase
          .from('arcusx_applications')
          .select('id, applicant_id')
          .eq('id', pendingId)
          .eq('applicant_id', userId)
          .maybeSingle();
        if (pendingApp?.applicant_id) {
          fixApplicantId = Number(pendingApp.applicant_id);
          fixProposalId = Number(pendingApp.id);
        }
      }
    }

    if (fixApplicantId && fixApplicantId === userId) {
      row.accepted_applicant_id = fixApplicantId;
      await auth.supabase.from('arcusx_tasks').update({
        accepted_applicant_id: fixApplicantId,
        status: 'assigned',
        escrow_pending_proposal_id: null,
        updated_at: new Date().toISOString(),
      }).eq('id', taskId);
      if (fixProposalId) {
        await auth.supabase.from('arcusx_applications').update({ status: 'accepted' })
          .eq('id', fixProposalId);
        await auth.supabase.from('arcusx_applications').update({ status: 'rejected' })
          .eq('task_id', taskId).neq('id', fixProposalId);
      }
    }
  }

  const data = merged.filter((row) =>
    workerCanAccessSupervision(row as {
      escrow_id?: string | null;
      escrow_status?: string | null;
      escrow_fund_tx_hash?: string | null;
    }),
  );

  const creatorIds = (data ?? []).map((row) => Number(row.user_id));
  const enrichment = await loadCreatorEnrichment(auth.supabase, creatorIds);

  const out = (data ?? []).map((row) => {
    const creator = row.arcusx_users as {
      id?: number;
      username?: string;
      average_rating?: number;
      total_ratings?: number;
    } | null;
    const uid = Number(row.user_id);
    const box = enrichment.get(uid);
    const display = creatorDisplayFields(
      box?.user ?? creator,
      box?.enterpriseProfile ?? null,
      box?.individualProfile ?? null,
    );
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
      status: row.status ?? 'assigned',
      accepted_applicant_id: row.accepted_applicant_id,
      escrow_id: row.escrow_id ?? null,
      escrow_status: row.escrow_status ?? null,
      escrow_fund_tx_hash: row.escrow_fund_tx_hash ?? null,
      creator_id: creator?.id ?? uid,
      creator_username: normalizeDisplayText(display.creator_username),
      creator_display_name: normalizeDisplayText(display.creator_display_name),
      creator_verified: display.creator_verified,
      creator_verified_enterprise: display.creator_verified_enterprise,
      creator_verified_individual: display.creator_verified_individual,
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
  const { data: feeRow } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  const platformFee = normalizePlatformFeeRate(feeRow?.config_value);

  const [{ count: openTasks }, volumeRows, oauthUserCount] = await Promise.all([
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true })
      .eq('status', 'open').is('accepted_applicant_id', null),
    loadReleasedVolumeRows(supabase, platformFee),
    getOauthUserCount(supabase),
  ]);

  const { volume, count: releasedCount } = sumVolumeRows(volumeRows);
  return jsonSuccess(req, {
    open_tasks: openTasks ?? 0,
    total_users: oauthUserCount,
    total_volume_usdc: Math.round(volume),
    released_transactions: releasedCount,
    data_source: 'supabase_oauth',
  });
}

export async function getPlatformFee(ctx: ApiContext): Promise<Response> {
  const { req, supabase } = ctx;
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  /** Share ArcusX on-chain (TW platformFee). */
  const arcusxShare = normalizePlatformFeeRate(data?.config_value);
  /**
   * Integrator-facing rate = ArcusX + TW protocol (covers on-chain op).
   * Example: 1.7% + 0.3% = 2%. Do not hardcode in partner UIs — always call this.
   */
  const platformFee = arcusxShare + TRUSTLESS_WORK_PROTOCOL_FEE;
  return jsonResponse(req, {
    success: true,
    platform_fee: platformFee,
    platform_fee_percent: Math.round(platformFee * 10000) / 100,
    arcusx_share: arcusxShare,
    protocol_share: TRUSTLESS_WORK_PROTOCOL_FEE,
  });
}

/** Quote bilateral de fondeo — TW oculto; integrador solo ve montos ArcusX. */
export async function getEscrowQuote(ctx: ApiContext): Promise<Response> {
  const { req, url, supabase, stellarNetwork } = ctx;
  const nominal = Number(
    url.searchParams.get('nominal') ?? url.searchParams.get('amount_usdc') ?? 0,
  );
  if (!Number.isFinite(nominal) || nominal <= 0) {
    return jsonError(req, 'nominal o amount_usdc requerido (> 0)', 400);
  }

  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  const platformFee = normalizePlatformFeeRate(data?.config_value);
  const quote = quoteBilateralFromNominal(nominal, platformFee);

  return jsonSuccess(req, {
    currency: 'USDC',
    network: stellarNetworkApiLabel(stellarNetwork),
    quote,
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
    auth.supabase.from('arcusx_users').select('cooldown_until, is_admin, role').eq('id', userId).single(),
  ]);

  const tasksTodayN = tasksToday ?? 0;
  const tasksWeekN = tasksThisWeek ?? 0;
  const isAdmin = user?.is_admin === true || user?.role === 'admin';
  let canCreate = isAdmin || (tasksTodayN < 5 && tasksWeekN < 50);
  let cooldownRemaining = 0;
  let nextTaskTime = 'Ahora';

  if (!isAdmin && user?.cooldown_until) {
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
