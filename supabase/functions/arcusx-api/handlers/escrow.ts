import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import {
  formatFundsReleasedMessage,
  insertArcusxNotification,
} from '../../_shared/arcusx-notifications.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import type { ApiContext } from './types.ts';
import { requireUser } from './require.ts';

export async function createEscrow(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const proposalId = body.proposal_id ? Number(body.proposal_id) : null;
  const contractAddress = body.contract_address ? String(body.contract_address) : null;
  const transactionHash = body.transaction_hash ? String(body.transaction_hash) : null;

  if (!taskId) return jsonError(req, 'task_id es requerido', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, escrow_status, accepted_applicant_id')
    .eq('id', taskId)
    .single();

  if (!task || task.user_id !== auth.userId) {
    return jsonError(req, 'Tarea no encontrada o sin permisos', 404);
  }

  if (contractAddress && transactionHash) {
    const { data: fundedTask } = await auth.supabase
      .from('arcusx_tasks')
      .select('title, accepted_applicant_id')
      .eq('id', taskId)
      .single();
    const { error } = await auth.supabase.from('arcusx_tasks').update({
      escrow_id: contractAddress,
      escrow_status: 'active',
      updated_at: new Date().toISOString(),
    }).eq('id', taskId);
    if (error) return jsonError(req, error.message, 500);
    const workerId = Number(fundedTask?.accepted_applicant_id);
    if (workerId) {
      await insertArcusxNotification(auth.supabase, {
        user_id_mysql: workerId,
        title: 'Escrow fondeado',
        message: `El escrow de "${fundedTask?.title ?? 'tu tarea'}" está activo. Ya puedes comenzar el trabajo.`,
        type: 'success',
        email: false,
      });
    }
    await logDomainEvent(auth.supabase, {
      entity_type: 'task',
      entity_id: taskId,
      event_type: 'escrow.funded',
      actor_user_id: auth.userId,
      payload: { contract_id: contractAddress, tx: transactionHash },
    });
    return jsonSuccess(req, { message: 'Firma confirmada' });
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
    status: 'in_progress',
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

  const patch: Record<string, unknown> = {
    accepted_applicant_id: app.applicant_id,
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  };
  if (escrowId) {
    patch.escrow_id = escrowId;
    patch.escrow_status = transactionHash ? 'active' : 'pending_signature';
  }

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
      title: 'Propuesta aceptada',
      message:
        `Tu propuesta fue seleccionada para "${task.title ?? 'la tarea'}". ` +
        (escrowId
          ? 'El cliente está configurando el escrow; conecta tu wallet cuando corresponda.'
          : 'El cliente creará el escrow a continuación.'),
      type: 'success',
      email: false,
    });
  }

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'proposal.selected',
    actor_user_id: auth.userId,
    payload: { proposal_id: proposalId, escrow_id: escrowId },
  });

  return jsonSuccess(req, { message: 'Propuesta seleccionada' });
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
  if (!taskId || !invitedUserId || !escrowId) {
    return jsonError(req, 'task_id, invited_user_id y escrow_id son requeridos', 400);
  }
  if (!STELLAR_G.test(workerWallet)) {
    return jsonError(req, 'worker_wallet_address inválida', 400);
  }

  const { data: task, error: taskErr } = await auth.supabase
    .from('arcusx_tasks')
    .select(`
      id, user_id, is_private_invite, invited_user_id, title, price, currency,
      arcusx_users!arcusx_tasks_user_id_fkey (username)
    `)
    .eq('id', taskId)
    .single();

  if (taskErr || !task) return jsonError(req, 'Tarea no encontrada', 404);
  if (task.user_id !== auth.userId) return jsonError(req, 'Sin permisos', 403);
  if (!task.is_private_invite || Number(task.invited_user_id) !== invitedUserId) {
    return jsonError(req, 'La tarea no es una oferta privada válida para este usuario', 400);
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
        status: 'accepted',
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
        status: 'accepted',
        worker_wallet_address: workerWallet,
      })
      .eq('id', applicationId);
    await auth.supabase
      .from('arcusx_applications')
      .update({ status: 'rejected' })
      .eq('task_id', taskId)
      .neq('id', applicationId);
  }

  const patch: Record<string, unknown> = {
    accepted_applicant_id: invitedUserId,
    status: 'in_progress',
    escrow_id: escrowId,
    escrow_status: 'active',
    updated_at: new Date().toISOString(),
  };
  if (body.escrow_amount != null) patch.escrow_amount = Number(body.escrow_amount);
  if (body.platform_fee != null) patch.escrow_platform_fee = Number(body.platform_fee);

  const { error: updErr } = await auth.supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
  if (updErr) return jsonError(req, updErr.message, 500);

  const creator = task.arcusx_users as { username?: string } | null;
  const creatorName = creator?.username ?? 'Un cliente';
  const amount = body.escrow_amount != null ? String(body.escrow_amount) : String(task.price ?? '');
  const cur = String((task as { currency?: string }).currency ?? 'USDC');
  await insertArcusxNotification(auth.supabase, {
    user_id_mysql: invitedUserId,
    title: 'Nueva oferta privada',
    message:
      `${creatorName} te envió una oferta privada fondeada: "${task.title ?? 'Tarea'}". ` +
      `Presupuesto: ${amount} ${cur}. Revisa la pestaña Ofertas en tu panel.`,
    type: 'success',
    email: true,
  });

  return jsonSuccess(req, {
    message: 'Oferta privada activada',
    application_id: applicationId,
    escrow_id: escrowId,
  });
}

export async function completeTask(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const action = String(body.action ?? 'accept');

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
      if (task.escrow_status) patch.escrow_status = 'refunded';
    } else if (action === 'accept') {
      patch.client_accepted_completion = true;
      if (escrowCompleted) {
        patch.status = 'completed';
        patch.completed_at = new Date().toISOString();
        patch.escrow_status = 'completed';
        patch.escrow_completed_at = new Date().toISOString();
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
      payload: { escrow_completed: true },
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
