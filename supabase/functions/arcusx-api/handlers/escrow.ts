import type { SupabaseClient } from '@supabase/supabase-js';
import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import {
  formatFundsReleasedMessage,
  insertArcusxNotification,
} from '../../_shared/arcusx-notifications.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import type { ApiContext } from './types.ts';
import { requireUser } from './require.ts';
import { computeTaskRefundAmount } from './cancellation-helpers.ts';

/** Asigna trabajador, acepta propuesta y notifica (in-app + email) tras fondeo. */
async function assignWorkerAfterEscrowFunded(
  supabase: SupabaseClient,
  opts: {
    taskId: number;
    taskTitle: string;
    proposalId: number;
    workerId: number;
    escrowId: string;
    fundTxHash: string;
    escrowAmount?: number | null;
    platformFee?: number | null;
    escrowCreatedAt?: string | null;
    clientFunderWallet?: string | null;
  },
): Promise<void> {
  const { data: existing } = await supabase
    .from('arcusx_tasks')
    .select('accepted_applicant_id, escrow_fund_tx_hash')
    .eq('id', opts.taskId)
    .maybeSingle();
  const alreadyAssigned =
    Number(existing?.accepted_applicant_id) === opts.workerId &&
    String(existing?.escrow_fund_tx_hash ?? '').trim() === opts.fundTxHash.trim();

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    accepted_applicant_id: opts.workerId,
    status: 'assigned',
    escrow_id: opts.escrowId,
    escrow_status: 'active',
    escrow_fund_tx_hash: opts.fundTxHash,
    escrow_pending_proposal_id: null,
    updated_at: now,
  };
  if (!opts.escrowCreatedAt) patch.escrow_created_at = now;
  if (opts.escrowAmount != null) patch.escrow_amount = opts.escrowAmount;
  if (opts.platformFee != null) patch.escrow_platform_fee = opts.platformFee;
  const funder = String(opts.clientFunderWallet ?? '').trim();
  if (funder.startsWith('G') && funder.length === 56) {
    patch.client_funder_wallet = funder;
  }

  const { error } = await supabase.from('arcusx_tasks').update(patch).eq('id', opts.taskId);
  if (error) throw new Error(error.message);

  await supabase.from('arcusx_applications').update({ status: 'accepted' })
    .eq('id', opts.proposalId);
  await supabase.from('arcusx_applications').update({ status: 'rejected' })
    .eq('task_id', opts.taskId).neq('id', opts.proposalId);

  if (!alreadyAssigned) {
    await insertArcusxNotification(supabase, {
      user_id_mysql: opts.workerId,
      title: 'Propuesta aceptada',
      message:
        `Tu propuesta fue seleccionada para "${opts.taskTitle}". ` +
        'El escrow está fondeado: revisa «Tareas en progreso» y comienza el trabajo.',
      type: 'success',
      email: true,
    });
  }
}

async function resolveProposalIdForFund(
  supabase: SupabaseClient,
  taskId: number,
  explicitProposalId: number | null,
): Promise<number | null> {
  if (explicitProposalId) return explicitProposalId;
  const { data: row } = await supabase
    .from('arcusx_tasks')
    .select('escrow_pending_proposal_id')
    .eq('id', taskId)
    .maybeSingle();
  const pending = row?.escrow_pending_proposal_id;
  return pending != null ? Number(pending) : null;
}

export async function createEscrow(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const proposalId = body.proposal_id ? Number(body.proposal_id) : null;
  const contractId = String(body.escrow_id ?? body.contract_address ?? '').trim();
  const transactionHash = body.transaction_hash ? String(body.transaction_hash) : null;
  const fundingConfirm = body.funding_confirmed === true ||
    body.escrow_status === 'active';

  if (!taskId) return jsonError(req, 'task_id es requerido', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, title, escrow_status, escrow_created_at, accepted_applicant_id, escrow_pending_proposal_id')
    .eq('id', taskId)
    .single();

  if (!task || task.user_id !== auth.userId) {
    return jsonError(req, 'Tarea no encontrada o sin permisos', 404);
  }

  if (contractId && transactionHash && fundingConfirm) {
    const resolvedProposalId = await resolveProposalIdForFund(
      auth.supabase,
      taskId,
      proposalId,
    );
    if (!resolvedProposalId) {
      return jsonError(req, 'proposal_id o escrow_pending_proposal_id requerido para registrar fondeo', 400);
    }

    const { data: app } = await auth.supabase
      .from('arcusx_applications')
      .select('applicant_id')
      .eq('id', resolvedProposalId)
      .eq('task_id', taskId)
      .single();
    if (!app) return jsonError(req, 'Propuesta no encontrada', 404);

    try {
      await assignWorkerAfterEscrowFunded(auth.supabase, {
        taskId,
        taskTitle: String(task.title ?? 'la tarea'),
        proposalId: resolvedProposalId,
        workerId: Number(app.applicant_id),
        escrowId: contractId,
        fundTxHash: transactionHash,
        escrowAmount: body.escrow_amount != null ? Number(body.escrow_amount) : null,
        platformFee: body.platform_fee != null ? Number(body.platform_fee) : null,
        escrowCreatedAt: task.escrow_created_at as string | null,
        clientFunderWallet: body.client_wallet_address
          ? String(body.client_wallet_address)
          : null,
      });
    } catch (e) {
      return jsonError(req, e instanceof Error ? e.message : 'Error al registrar fondeo', 500);
    }

    await logDomainEvent(auth.supabase, {
      entity_type: 'task',
      entity_id: taskId,
      event_type: 'escrow.funded',
      actor_user_id: auth.userId,
      payload: { contract_id: contractId, tx: transactionHash, proposal_id: resolvedProposalId },
    });
    return jsonSuccess(req, { message: 'Escrow fondeado y trabajador asignado' });
  }

  if (contractId && transactionHash) {
    let applicantId = task.accepted_applicant_id as number | null;
    if (proposalId) {
      const { data: app } = await auth.supabase
        .from('arcusx_applications')
        .select('applicant_id')
        .eq('id', proposalId)
        .eq('task_id', taskId)
        .single();
      if (app) applicantId = app.applicant_id as number;
    }

    const patch: Record<string, unknown> = {
      escrow_id: contractId,
      escrow_deploy_tx_hash: transactionHash,
      escrow_status: 'pending_funding',
      escrow_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      accepted_applicant_id: null,
      status: 'open',
    };
    if (proposalId) patch.escrow_pending_proposal_id = proposalId;
    if (body.escrow_amount != null) patch.escrow_amount = Number(body.escrow_amount);
    if (body.platform_fee != null) patch.escrow_platform_fee = Number(body.platform_fee);
    if (body.trustline_address) {
      patch.escrow_trustline_address = String(body.trustline_address);
    }
    const clientFunder = String(body.client_wallet_address ?? '').trim();
    if (clientFunder.startsWith('G') && clientFunder.length === 56) {
      patch.client_funder_wallet = clientFunder;
    }

    const { error } = await auth.supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
    if (error) return jsonError(req, error.message, 500);

    await logDomainEvent(auth.supabase, {
      entity_type: 'task',
      entity_id: taskId,
      event_type: 'escrow.deployed',
      actor_user_id: auth.userId,
      payload: { contract_id: contractId, tx: transactionHash, proposal_id: proposalId },
    });

    return jsonSuccess(req, {
      message: 'Contrato escrow registrado',
      escrow_id: contractId,
    });
  }

  if (!proposalId) return jsonError(req, 'proposal_id es requerido para crear escrow', 400);

  const { data: app } = await auth.supabase
    .from('arcusx_applications')
    .select('applicant_id, worker_wallet_address')
    .eq('id', proposalId)
    .eq('task_id', taskId)
    .single();

  if (!app) return jsonError(req, 'Propuesta no encontrada', 404);

  const { error } = await auth.supabase.from('arcusx_tasks').update({
    accepted_applicant_id: app.applicant_id,
    status: 'assigned',
    escrow_status: 'pending_signature',
    updated_at: new Date().toISOString(),
  }).eq('id', taskId);

  if (error) return jsonError(req, error.message, 500);

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'escrow.prepared',
    actor_user_id: auth.userId,
    payload: { proposal_id: proposalId },
  });

  return jsonSuccess(req, {
    message: 'Escrow preparado',
    worker_wallet: app.worker_wallet_address,
  });
}

export async function selectProposal(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const proposalId = Number(body.proposal_id);
  const escrowId = body.escrow_id ? String(body.escrow_id) : null;
  const transactionHash = body.transaction_hash ? String(body.transaction_hash) : null;

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, title, user_id, status')
    .eq('id', taskId)
    .eq('user_id', auth.userId)
    .single();

  if (!task) return jsonError(req, 'Tarea o propuesta no encontrada', 404);

  const { data: app } = await auth.supabase
    .from('arcusx_applications')
    .select('applicant_id, worker_wallet_address')
    .eq('id', proposalId)
    .eq('task_id', taskId)
    .single();

  if (!app) return jsonError(req, 'Propuesta no encontrada', 404);

  if (escrowId && !transactionHash?.trim()) {
    return jsonError(
      req,
      'transaction_hash del fondeo es obligatorio para activar el escrow y asignar al trabajador',
      400,
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (escrowId && transactionHash) {
    try {
      await assignWorkerAfterEscrowFunded(auth.supabase, {
        taskId,
        taskTitle: String(task.title ?? 'la tarea'),
        proposalId,
        workerId: Number(app.applicant_id),
        escrowId,
        fundTxHash: transactionHash.trim(),
      });
    } catch (e) {
      return jsonError(req, e instanceof Error ? e.message : 'Error al asignar trabajador', 500);
    }
  } else {
    patch.accepted_applicant_id = app.applicant_id;
    patch.status = 'assigned';
    const { error } = await auth.supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
    if (error) return jsonError(req, error.message, 500);

    await auth.supabase.from('arcusx_applications').update({ status: 'accepted' })
      .eq('id', proposalId);
    await auth.supabase.from('arcusx_applications').update({ status: 'rejected' })
      .eq('task_id', taskId).neq('id', proposalId);

    const workerId = Number(app.applicant_id);
    if (workerId) {
      await insertArcusxNotification(auth.supabase, {
        user_id_mysql: workerId,
        title: 'Propuesta preseleccionada',
        message:
          `Tu propuesta fue elegida para "${task.title ?? 'la tarea'}". ` +
          'El cliente está configurando el escrow; te avisaremos cuando esté fondeado.',
        type: 'info',
        email: false,
      });
    }
  }

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'proposal.selected',
    actor_user_id: auth.userId,
    payload: { proposal_id: proposalId, escrow_id: escrowId, fund_tx: transactionHash },
  });

  return jsonSuccess(req, { message: 'Propuesta seleccionada' });
}

/** Descarta un escrow desplegado pero no fondeado para volver a elegir trabajador. */
export async function resetPendingEscrow(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  if (!taskId) return jsonError(req, 'task_id es requerido', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, escrow_status, escrow_id')
    .eq('id', taskId)
    .single();

  if (!task || task.user_id !== auth.userId) {
    return jsonError(req, 'Tarea no encontrada o sin permisos', 404);
  }

  const st = String(task.escrow_status ?? '').toLowerCase();
  if (!task.escrow_id) {
    return jsonError(req, 'No hay escrow pendiente que reiniciar', 400);
  }
  if (['active', 'completed', 'disputed', 'resolved', 'refunded'].includes(st)) {
    return jsonError(req, 'El escrow ya está activo o cerrado; no se puede reiniciar', 400);
  }

  const { error } = await auth.supabase
    .from('arcusx_tasks')
    .update({
      escrow_id: null,
      escrow_status: null,
      escrow_deploy_tx_hash: null,
      escrow_fund_tx_hash: null,
      escrow_amount: null,
      escrow_platform_fee: null,
      escrow_trustline_address: null,
      escrow_created_at: null,
      accepted_applicant_id: null,
      escrow_pending_proposal_id: null,
      status: 'open',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  if (error) return jsonError(req, error.message, 500);

  await auth.supabase
    .from('arcusx_applications')
    .update({ status: 'pending' })
    .eq('task_id', taskId)
    .in('status', ['accepted', 'rejected']);

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'escrow.pending_reset',
    actor_user_id: auth.userId,
    payload: { previous_escrow_id: task.escrow_id },
  });

  return jsonSuccess(req, { message: 'Escrow pendiente reiniciado; puedes elegir otro trabajador' });
}

const STELLAR_G = /^G[A-Z0-9]{55}$/;

/** Activa oferta privada tras crear y fondear escrow (sin propuesta previa). */
export async function finalizePrivateOffer(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const invitedUserId = Number(body.invited_user_id);
  const workerWallet = String(body.worker_wallet_address ?? '').trim();
  const escrowId = String(body.escrow_id ?? '').trim();
  const fundTx = body.transaction_hash ? String(body.transaction_hash) : null;
  if (!taskId || !invitedUserId || !escrowId) {
    return jsonError(req, 'task_id, invited_user_id y escrow_id son requeridos', 400);
  }
  if (!STELLAR_G.test(workerWallet)) {
    return jsonError(req, 'worker_wallet_address inválida', 400);
  }

  const { data: task, error: taskErr } = await auth.supabase
    .from('arcusx_tasks')
    .select(`
      id, user_id, status, accepted_applicant_id, escrow_id, escrow_status,
      is_private_invite, invited_user_id, title, price, currency,
      arcusx_users!arcusx_tasks_user_id_fkey (username)
    `)
    .eq('id', taskId)
    .single();

  if (taskErr || !task) return jsonError(req, 'Tarea no encontrada', 404);
  if (task.user_id !== auth.userId) return jsonError(req, 'Sin permisos', 403);
  if (!task.is_private_invite || Number(task.invited_user_id) !== invitedUserId) {
    return jsonError(req, 'La tarea no es una oferta privada válida para este usuario', 400);
  }

  const existingEscrow = String(task.escrow_id ?? '').trim();
  if (
    existingEscrow === escrowId &&
    Number(task.accepted_applicant_id) === invitedUserId &&
    task.status === 'assigned'
  ) {
    return jsonSuccess(req, {
      message: 'Oferta privada ya aceptada',
      escrow_id: escrowId,
      status: 'assigned',
    });
  }

  if (
    existingEscrow === escrowId &&
    !task.accepted_applicant_id &&
    (task.status === 'open' || task.status === 'private_offer_pending') &&
    task.escrow_status === 'active'
  ) {
    return jsonSuccess(req, {
      message: 'Oferta privada ya enviada',
      escrow_id: escrowId,
      status: task.status,
    });
  }

  const { data: worker } = await auth.supabase
    .from('arcusx_users')
    .select('id, private_payout_wallet, wallet_address')
    .eq('id', invitedUserId)
    .maybeSingle();

  const profileWallet = String(worker?.private_payout_wallet ?? worker?.wallet_address ?? '').trim();
  if (!STELLAR_G.test(profileWallet) || profileWallet !== workerWallet) {
    return jsonError(req, 'La wallet de cobro del invitado no coincide con su perfil', 400);
  }

  const { data: existingApp } = await auth.supabase
    .from('arcusx_applications')
    .select('id')
    .eq('task_id', taskId)
    .eq('applicant_id', invitedUserId)
    .maybeSingle();

  let applicationId = existingApp?.id as number | undefined;
  if (!applicationId) {
    const { data: inserted, error: insErr } = await auth.supabase
      .from('arcusx_applications')
      .insert({
        task_id: taskId,
        applicant_id: invitedUserId,
        message: `Oferta privada: ${task.title ?? 'tarea'}`,
        worker_wallet_address: workerWallet,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (insErr) return jsonError(req, insErr.message, 500);
    applicationId = inserted?.id as number;
  } else {
    await auth.supabase
      .from('arcusx_applications')
      .update({
        status: 'pending',
        worker_wallet_address: workerWallet,
      })
      .eq('id', applicationId);
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: 'private_offer_pending',
    escrow_id: escrowId,
    escrow_status: 'active',
    escrow_created_at: now,
    cancellation_allowed: true,
    updated_at: now,
  };
  if (fundTx) patch.escrow_fund_tx_hash = fundTx;
  const deployTx = body.deploy_transaction_hash
    ? String(body.deploy_transaction_hash)
    : null;
  if (deployTx) patch.escrow_deploy_tx_hash = deployTx;
  if (body.escrow_amount != null) patch.escrow_amount = Number(body.escrow_amount);
  if (body.platform_fee != null) patch.escrow_platform_fee = Number(body.platform_fee);
  if (body.trustline_address) {
    patch.escrow_trustline_address = String(body.trustline_address).trim();
  }

  const { error: updErr } = await auth.supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
  if (updErr) return jsonError(req, updErr.message, 500);

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'escrow.funded',
    actor_user_id: auth.userId,
    payload: {
      contract_id: escrowId,
      tx: fundTx,
      private_offer: true,
      invited_user_id: invitedUserId,
    },
  });

  const creator = task.arcusx_users as { username?: string } | null;
  const creatorName = creator?.username ?? 'Un cliente';
  const amount = String(task.price ?? '');
  const cur = String((task as { currency?: string }).currency ?? 'USDC');
  await insertArcusxNotification(auth.supabase, {
    user_id_mysql: invitedUserId,
    title: 'Nueva oferta privada',
    message:
      `${creatorName} te envió una oferta privada fondeada: "${task.title ?? 'Tarea'}". ` +
      `Presupuesto: ${amount} ${cur}. Acepta o rechaza en la pestaña Ofertas de tu panel.`,
    type: 'success',
    email: true,
  });

  return jsonSuccess(req, {
    message: 'Oferta privada enviada al freelancer',
    application_id: applicationId,
    escrow_id: escrowId,
    status: 'private_offer_pending',
  });
}

/** El freelancer invitado acepta una oferta privada ya fondeada. */
export async function acceptPrivateOffer(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  if (!taskId) return jsonError(req, 'task_id es requerido', 400);

  const { data: task, error: taskErr } = await auth.supabase
    .from('arcusx_tasks')
    .select(`
      id, title, user_id, status, accepted_applicant_id, escrow_id, escrow_status,
      escrow_fund_tx_hash, is_private_invite, invited_user_id, price, currency,
      arcusx_users!arcusx_tasks_user_id_fkey (username)
    `)
    .eq('id', taskId)
    .single();

  if (taskErr || !task) return jsonError(req, 'Tarea no encontrada', 404);
  if (!task.is_private_invite || Number(task.invited_user_id) !== auth.userId) {
    return jsonError(req, 'No eres el freelancer invitado a esta oferta', 403);
  }
  if (task.accepted_applicant_id) {
    return jsonError(req, 'Esta oferta ya fue aceptada', 400);
  }
  if (!task.escrow_id || task.escrow_status !== 'active') {
    return jsonError(req, 'La oferta aún no tiene contrato fondeado', 400);
  }
  if (!['open', 'private_offer_pending'].includes(String(task.status ?? ''))) {
    return jsonError(req, 'La oferta no está disponible para aceptar', 400);
  }

  const { data: app } = await auth.supabase
    .from('arcusx_applications')
    .select('id, worker_wallet_address')
    .eq('task_id', taskId)
    .eq('applicant_id', auth.userId)
    .maybeSingle();

  if (!app?.id) {
    return jsonError(req, 'No hay postulación pendiente para esta oferta', 400);
  }

  const now = new Date().toISOString();
  await auth.supabase
    .from('arcusx_applications')
    .update({ status: 'accepted', updated_at: now })
    .eq('id', app.id);
  await auth.supabase
    .from('arcusx_applications')
    .update({ status: 'rejected' })
    .eq('task_id', taskId)
    .neq('id', app.id);

  const { error: updErr } = await auth.supabase.from('arcusx_tasks').update({
    accepted_applicant_id: auth.userId,
    status: 'assigned',
    updated_at: now,
  }).eq('id', taskId);
  if (updErr) return jsonError(req, updErr.message, 500);

  const { data: worker } = await auth.supabase
    .from('arcusx_users')
    .select('username')
    .eq('id', auth.userId)
    .maybeSingle();
  const workerName = worker?.username ?? 'El freelancer';

  await insertArcusxNotification(auth.supabase, {
    user_id_mysql: Number(task.user_id),
    title: 'Oferta privada aceptada',
    message:
      `${workerName} aceptó tu oferta privada "${task.title ?? 'Tarea'}". ` +
      'Ya pueden supervisar el trabajo.',
    type: 'success',
    email: true,
  });

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'private_offer.accepted',
    actor_user_id: auth.userId,
    payload: { client_id: task.user_id },
  });

  return jsonSuccess(req, {
    message: 'Oferta privada aceptada',
    status: 'assigned',
    accepted_applicant_id: auth.userId,
  });
}

/** El freelancer invitado rechaza la oferta; el cliente debe recibir reembolso. */
export async function rejectPrivateOffer(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const reason = body.reason ? String(body.reason).slice(0, 500) : null;
  if (!taskId) return jsonError(req, 'task_id es requerido', 400);

  const { data: task, error: taskErr } = await auth.supabase
    .from('arcusx_tasks')
    .select(`
      id, title, user_id, status, accepted_applicant_id, escrow_id, escrow_status,
      escrow_amount, price, escrow_platform_fee, is_private_invite, invited_user_id,
      arcusx_users!arcusx_tasks_user_id_fkey (username)
    `)
    .eq('id', taskId)
    .single();

  if (taskErr || !task) return jsonError(req, 'Tarea no encontrada', 404);
  if (!task.is_private_invite || Number(task.invited_user_id) !== auth.userId) {
    return jsonError(req, 'No eres el freelancer invitado a esta oferta', 403);
  }
  if (task.accepted_applicant_id) {
    return jsonError(req, 'Esta oferta ya fue aceptada', 400);
  }
  if (!task.escrow_id) {
    return jsonError(req, 'No hay escrow fondeado para reembolsar', 400);
  }
  if (!['open', 'private_offer_pending'].includes(String(task.status ?? ''))) {
    return jsonError(req, 'La oferta no está disponible para rechazar', 400);
  }

  const refundAmount = await computeTaskRefundAmount(task, auth.supabase);
  const now = new Date().toISOString();

  const { data: app } = await auth.supabase
    .from('arcusx_applications')
    .select('id')
    .eq('task_id', taskId)
    .eq('applicant_id', auth.userId)
    .maybeSingle();

  if (app?.id) {
    await auth.supabase
      .from('arcusx_applications')
      .update({ status: 'rejected', updated_at: now })
      .eq('id', app.id);
  }

  const { error: updErr } = await auth.supabase.from('arcusx_tasks').update({
    status: 'private_offer_rejected',
    cancellation_allowed: true,
    cancellation_reason: reason ?? 'Freelancer rechazó la oferta privada',
    cancellation_requested_at: now,
    updated_at: now,
  }).eq('id', taskId);
  if (updErr) return jsonError(req, updErr.message, 500);

  const { data: worker } = await auth.supabase
    .from('arcusx_users')
    .select('username')
    .eq('id', auth.userId)
    .maybeSingle();
  const workerName = worker?.username ?? 'El freelancer';

  await insertArcusxNotification(auth.supabase, {
    user_id_mysql: Number(task.user_id),
    title: 'Oferta privada rechazada',
    message:
      `${workerName} rechazó tu oferta privada "${task.title ?? 'Tarea'}". ` +
      'Inicia el reembolso desde tu panel para recuperar los fondos del escrow.',
    type: 'warning',
    email: true,
  });

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'private_offer.rejected',
    actor_user_id: auth.userId,
    payload: { client_id: task.user_id, reason },
  });

  return jsonSuccess(req, {
    message: 'Oferta privada rechazada. El cliente recibirá reembolso.',
    status: 'private_offer_rejected',
    requires_client_refund: true,
    refund_amount: refundAmount,
    escrow_id: task.escrow_id,
  });
}

export async function completeTask(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const action = String(body.action ?? 'accept');
  const txHash = body.tx_hash ? String(body.tx_hash) : null;

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!task) return jsonError(req, 'Tarea no encontrada.', 404);

  const isClient = task.user_id === auth.userId;
  const isWorker = task.accepted_applicant_id === auth.userId;
  if (!isClient && !isWorker) return jsonError(req, 'No autorizado', 403);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const escrowCompleted = Boolean(body.escrow_completed);
  const taskTitle = String(task.title ?? 'la tarea');

  if (isWorker) {
    if (action !== 'accept') {
      return jsonError(req, 'El trabajador solo puede notificar la entrega', 400);
    }
    patch.worker_accepted_completion = true;
  }

  if (isClient) {
    if (action === 'reject') {
      patch.status = 'rejected';
      patch.client_accepted_completion = false;
    } else if (action === 'accept') {
      patch.client_accepted_completion = true;
      if (escrowCompleted) {
        if (!task.escrow_id) {
          return jsonError(req, 'No hay escrow para marcar como completado.', 400);
        }
        const escrowSt = String(task.escrow_status ?? '');
        if (!['active', 'completed'].includes(escrowSt)) {
          return jsonError(
            req,
            'El escrow debe estar activo (fondeado) para completar la tarea.',
            400,
          );
        }
        if (!txHash) {
          return jsonError(req, 'tx_hash es requerido tras liberar fondos on-chain.', 400);
        }
        const completedAt = new Date().toISOString();
        patch.status = 'completed';
        patch.completed_at = completedAt;
        patch.escrow_status = 'completed';
        patch.escrow_completed_at = completedAt;
        patch.escrow_release_tx_hash = txHash;
        patch.scheduled_deletion_at = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString();
      }
    }
  }

  const { error } = await auth.supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
  if (error) return jsonError(req, error.message, 500);

  if (isWorker && action === 'accept') {
    await insertArcusxNotification(auth.supabase, {
      user_id_mysql: Number(task.user_id),
      title: 'Entrega notificada',
      message:
        `El freelancer avisó que terminó "${taskTitle}". Revisa la entrega y libera el pago cuando quieras.`,
      type: 'info',
      email: true,
    });
    await logDomainEvent(auth.supabase, {
      entity_type: 'task',
      entity_id: taskId,
      event_type: 'task.delivery_notified',
      actor_user_id: auth.userId,
    });
    return jsonSuccess(req, {
      message: 'Aviso enviado al cliente. Él decide cuándo liberar el pago.',
      task_id: taskId,
      worker_accepted_completion: 1,
    });
  }

  if (isClient && action === 'accept' && escrowCompleted) {
    const workerId = Number(task.accepted_applicant_id);
    if (workerId > 0) {
      const { data: workerRow } = await auth.supabase
        .from('arcusx_users')
        .select('completed_tasks_count')
        .eq('id', workerId)
        .maybeSingle();
      const nextCount = Number(workerRow?.completed_tasks_count ?? 0) + 1;
      await auth.supabase
        .from('arcusx_users')
        .update({ completed_tasks_count: nextCount })
        .eq('id', workerId);

      const { data: lastRating } = await auth.supabase
        .from('arcusx_ratings')
        .select('rating, review')
        .eq('task_id', taskId)
        .eq('rated_id', workerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      await insertArcusxNotification(auth.supabase, {
        user_id_mysql: workerId,
        title: 'Ya liberaron tu pago',
        message: formatFundsReleasedMessage(
          `"${taskTitle}"`,
          lastRating?.rating,
          lastRating?.review,
        ),
        type: 'success',
        email: true,
      });
    }
    await logDomainEvent(auth.supabase, {
      entity_type: 'task',
      entity_id: taskId,
      event_type: 'task.completed',
      actor_user_id: auth.userId,
      payload: { escrow_completed: true, release_tx: txHash },
    });
    return jsonSuccess(req, {
      message: 'Tarea completada y fondos liberados',
      task_id: taskId,
      status: 'completed',
    });
  }

  if (isClient && action === 'reject') {
    const workerId = Number(task.accepted_applicant_id);
    if (workerId > 0) {
      await insertArcusxNotification(auth.supabase, {
        user_id_mysql: workerId,
        title: 'Entrega rechazada',
        message:
          `El cliente rechazó la entrega de "${taskTitle}". Revisa el estado de la tarea y el escrow.`,
        type: 'warning',
        email: false,
      });
    }
    await logDomainEvent(auth.supabase, {
      entity_type: 'task',
      entity_id: taskId,
      event_type: 'task.delivery_rejected',
      actor_user_id: auth.userId,
    });
    return jsonSuccess(req, {
      message: 'Entrega rechazada',
      task_id: taskId,
      status: 'rejected',
    });
  }

  return jsonSuccess(req, {
    message: isClient ? 'Confirmación del cliente registrada' : 'Estado actualizado',
    task_id: taskId,
  });
}
