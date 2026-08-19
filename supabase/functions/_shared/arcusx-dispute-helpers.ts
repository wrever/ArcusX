import type { SupabaseClient } from '@supabase/supabase-js';

export type DisputeTaskRow = {
  id: number;
  user_id: number;
  accepted_applicant_id: number | null;
  title?: string;
  price?: number;
  files?: unknown;
  escrow_id?: string | null;
  escrow_secret?: string | null;
  escrow_status?: string | null;
  escrow_created_at?: string | null;
  escrow_fund_tx_hash?: string | null;
  status?: string;
  created_at?: string;
  client_accepted_completion?: number;
  worker_accepted_completion?: number;
};

export type DisputeRow = {
  id: number;
  task_id?: number | null;
  agreement_id?: string | null;
  created_by: number;
  reason?: string;
  created_at?: string;
  status?: string;
};

export type DisputeDealRow = {
  id: string;
  title?: string;
  amount_usdc?: number;
  initiator_user_id: number;
  counterparty_user_id: number | null;
  escrow_contract_id?: string | null;
  escrow_status?: string | null;
  status?: string;
  created_at?: string;
  accepted_at?: string | null;
  funded_at?: string | null;
  funder_role?: string;
  beneficiary_wallet?: string;
};

export type DisputeLoadedContext =
  | { kind: 'task'; dispute: DisputeRow; task: DisputeTaskRow }
  | { kind: 'deal'; dispute: DisputeRow; deal: DisputeDealRow };

export async function loadDisputeContext(
  supabase: SupabaseClient,
  disputeId: number,
): Promise<DisputeLoadedContext | null> {
  const { data: dispute } = await supabase
    .from('arcusx_disputes')
    .select('id, task_id, agreement_id, created_by, reason, created_at, status')
    .eq('id', disputeId)
    .maybeSingle();

  if (!dispute) return null;

  if (dispute.agreement_id) {
    const { data: deal } = await supabase
      .from('arcusx_agreements')
      .select(`
        id, title, amount_usdc, initiator_user_id, counterparty_user_id,
        escrow_contract_id, escrow_status, status, created_at, accepted_at, funded_at,
        funder_role, beneficiary_wallet
      `)
      .eq('id', dispute.agreement_id)
      .maybeSingle();
    if (!deal) return null;
    return {
      kind: 'deal',
      dispute: dispute as DisputeRow,
      deal: deal as DisputeDealRow,
    };
  }

  if (!dispute.task_id) return null;

  const { data: task } = await supabase
    .from('arcusx_tasks')
    .select(`
      id, user_id, accepted_applicant_id, title, price, files,
      escrow_id, escrow_secret, escrow_status, escrow_created_at, escrow_fund_tx_hash,
      status, created_at, client_accepted_completion, worker_accepted_completion
    `)
    .eq('id', dispute.task_id)
    .maybeSingle();

  if (!task) return null;
  return { kind: 'task', dispute: dispute as DisputeRow, task: task as DisputeTaskRow };
}

export async function loadDisputeContextByAgreementId(
  supabase: SupabaseClient,
  agreementId: string,
): Promise<DisputeLoadedContext | null> {
  const { data: deal } = await supabase
    .from('arcusx_agreements')
    .select(`
      id, title, amount_usdc, initiator_user_id, counterparty_user_id,
      escrow_contract_id, escrow_status, status, created_at, accepted_at, funded_at,
      funder_role, beneficiary_wallet
    `)
    .eq('id', agreementId)
    .maybeSingle();

  if (!deal) return null;

  const { data: dispute } = await supabase
    .from('arcusx_disputes')
    .select('id, task_id, agreement_id, created_by, reason, created_at, status')
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dispute) {
    return {
      kind: 'deal',
      dispute: dispute as DisputeRow,
      deal: deal as DisputeDealRow,
    };
  }

  const escrowSt = String(deal.escrow_status ?? '').toLowerCase();
  if (String(deal.status) !== 'disputed' && escrowSt !== 'disputed') return null;

  return {
    kind: 'deal',
    dispute: {
      id: 0,
      agreement_id: agreementId,
      created_by: Number(deal.initiator_user_id),
      reason: 'Disputa detectada sin registro en BD',
      created_at: new Date().toISOString(),
      status: 'pending',
    },
    deal: deal as DisputeDealRow,
  };
}

const DISPUTE_TASK_SELECT = `
  id, user_id, accepted_applicant_id, title, price, files,
  escrow_id, escrow_secret, escrow_status, escrow_created_at, escrow_fund_tx_hash,
  status, created_at, client_accepted_completion, worker_accepted_completion,
  cancellation_tx_hash, cancellation_requested_at, cancellation_reason, updated_at
`;

/** Carga disputa por task_id; si no hay fila en arcusx_disputes, sintetiza una mínima. */
export async function loadDisputeContextByTaskId(
  supabase: SupabaseClient,
  taskId: number,
): Promise<DisputeLoadedContext | null> {
  const { data: task } = await supabase
    .from('arcusx_tasks')
    .select(DISPUTE_TASK_SELECT)
    .eq('id', taskId)
    .maybeSingle();

  if (!task) return null;

  const { data: dispute } = await supabase
    .from('arcusx_disputes')
    .select('id, task_id, created_by, reason, created_at, status')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dispute) {
    return { kind: 'task', dispute: dispute as DisputeRow, task: task as DisputeTaskRow };
  }

  const escrowSt = String(task.escrow_status ?? '').toLowerCase();
  const hasCancellation = Boolean(String(task.cancellation_tx_hash ?? '').trim());
  if (escrowSt !== 'disputed' && escrowSt !== 'pending_dispute_resolution' && !hasCancellation) {
    return null;
  }

  return {
    kind: 'task',
    dispute: {
      id: 0,
      task_id: taskId,
      created_by: Number(task.user_id),
      reason: String(task.cancellation_reason ?? 'Disputa detectada sin registro en BD'),
      created_at: String(task.cancellation_requested_at ?? task.updated_at ?? new Date().toISOString()),
      status: 'pending',
    },
    task: task as DisputeTaskRow,
  };
}

export async function buildDealDisputeChatPayload(
  supabase: SupabaseClient,
  deal: DisputeDealRow,
): Promise<{
  messages: Array<Record<string, unknown>>;
  participants: Record<string, unknown>;
  stats: Record<string, number>;
}> {
  const clientId = Number(deal.initiator_user_id);
  const workerId = deal.counterparty_user_id ? Number(deal.counterparty_user_id) : null;
  const { client, worker } = await loadParticipantUsers(supabase, clientId, workerId);
  return {
    messages: [],
    participants: {
      ...(client ? { client: { ...client, role: 'initiator' } } : {}),
      ...(worker ? { worker: { ...worker, role: 'counterparty' } } : {}),
    },
    stats: { total_messages: 0, client_messages: 0, worker_messages: 0, files_shared: 0 },
  };
}

export async function buildDealDisputeFilesPayload(
  supabase: SupabaseClient,
  deal: DisputeDealRow,
): Promise<{ files: Record<string, unknown[]>; summary: Record<string, number> }> {
  const files = {
    task_files: [] as Array<Record<string, unknown>>,
    chat_files: [] as Array<Record<string, unknown>>,
    delivery_files: [] as Array<Record<string, unknown>>,
  };

  const { data: rows } = await supabase
    .from('arcusx_deal_evidence')
    .select('id, user_id, note, files, created_at')
    .eq('agreement_id', deal.id)
    .order('created_at', { ascending: true });

  let idx = 0;
  for (const row of rows ?? []) {
    const uploadedBy = Number(row.user_id) === Number(deal.initiator_user_id) ? 'client' : 'worker';
    if (row.note) {
      idx += 1;
      files.delivery_files.push({
        id: `note-${row.id}`,
        filename: `nota-evidencia-${row.id}.txt`,
        url: '',
        type: 'text/plain',
        size: String(row.note).length,
        size_formatted: formatFileSize(String(row.note).length),
        uploaded_at: row.created_at,
        uploaded_by: uploadedBy,
        note: String(row.note),
      });
    }
    const fileList = Array.isArray(row.files) ? row.files : [];
    for (const raw of fileList) {
      idx += 1;
      const f = raw as Record<string, unknown>;
      const filename = String(f.name ?? `archivo_${idx}`);
      const path = typeof f.path === 'string' ? f.path : null;
      let url = typeof f.url === 'string' ? f.url : '';
      if (path) {
        const { data: signed } = await supabase.storage
          .from('milestone-evidence')
          .createSignedUrl(path, 60 * 60 * 24);
        if (signed?.signedUrl) url = signed.signedUrl;
      }
      files.delivery_files.push({
        id: idx,
        filename,
        url,
        type: String(f.type ?? mimeFromFilename(filename)),
        size: Number(f.size ?? 0),
        size_formatted: Number(f.size ?? 0) > 0 ? formatFileSize(Number(f.size)) : 'N/A',
        uploaded_at: f.uploadedAt ?? row.created_at,
        uploaded_by: uploadedBy,
      });
    }
  }

  const summary = {
    total_files: files.delivery_files.length,
    task_files_count: 0,
    chat_files_count: 0,
    delivery_files_count: files.delivery_files.length,
  };
  return { files, summary };
}

export async function buildDealDisputeTimelinePayload(
  supabase: SupabaseClient,
  dispute: DisputeRow,
  deal: DisputeDealRow,
): Promise<Array<Record<string, unknown>>> {
  const clientId = Number(deal.initiator_user_id);
  const workerId = deal.counterparty_user_id ? Number(deal.counterparty_user_id) : null;
  const { client, worker } = await loadParticipantUsers(supabase, clientId, workerId);
  const timeline: Array<Record<string, unknown>> = [];

  timeline.push({
    type: 'deal_created',
    title: 'Deal creado',
    description: deal.title ?? 'Acuerdo',
    timestamp: deal.created_at,
    actor: client?.username ?? 'Creador',
  });
  if (deal.accepted_at) {
    timeline.push({
      type: 'deal_accepted',
      title: 'Deal aceptado',
      description: 'La contraparte aceptó el acuerdo',
      timestamp: deal.accepted_at,
      actor: worker?.username ?? 'Contraparte',
    });
  }
  if (deal.funded_at) {
    timeline.push({
      type: 'escrow_funded',
      title: 'Escrow fondeado',
      description: 'USDC depositados en el contrato escrow',
      timestamp: deal.funded_at,
      actor: 'Pagador',
    });
  }
  if (dispute.created_at) {
    timeline.push({
      type: 'dispute_created',
      title: 'Disputa abierta',
      description: dispute.reason ?? 'Sin motivo',
      timestamp: dispute.created_at,
      actor: 'Participante',
    });
  }
  return timeline;
}

export async function loadParticipantUsers(
  supabase: SupabaseClient,
  clientId: number | null,
  workerId: number | null,
): Promise<{
  client?: { id: number; username: string; email: string };
  worker?: { id: number; username: string; email: string };
  byId: Map<number, { id: number; username: string; email: string }>;
}> {
  const ids = [clientId, workerId].filter((id): id is number => !!id && id > 0);
  const byId = new Map<number, { id: number; username: string; email: string }>();
  if (ids.length === 0) {
    return { byId };
  }

  const { data: rows } = await supabase
    .from('arcusx_users')
    .select('id, username, email')
    .in('id', ids);

  for (const u of rows ?? []) {
    const row = {
      id: Number(u.id),
      username: String(u.username ?? 'Usuario'),
      email: String(u.email ?? ''),
    };
    byId.set(row.id, row);
  }

  return {
    client: clientId ? byId.get(clientId) : undefined,
    worker: workerId ? byId.get(workerId) : undefined,
    byId,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} bytes`;
}

function mimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    zip: 'application/zip',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] ?? 'application/octet-stream';
}

export async function buildDisputeChatPayload(
  supabase: SupabaseClient,
  task: DisputeTaskRow,
): Promise<{
  messages: Array<Record<string, unknown>>;
  participants: Record<string, unknown>;
  stats: Record<string, number>;
}> {
  const clientId = Number(task.user_id);
  const workerId = task.accepted_applicant_id ? Number(task.accepted_applicant_id) : null;
  const { client, worker, byId } = await loadParticipantUsers(supabase, clientId, workerId);

  const { data: rawMessages } = await supabase
    .from('arcusx_task_messages')
    .select('id, sender_mysql_id, receiver_mysql_id, body, created_at')
    .eq('task_id', task.id)
    .order('created_at', { ascending: true });

  const messages: Array<Record<string, unknown>> = [];
  let clientMessages = 0;
  let workerMessages = 0;

  for (const m of rawMessages ?? []) {
    const senderId = Number(m.sender_mysql_id);
    const receiverId = Number(m.receiver_mysql_id);
    const sender = byId.get(senderId);
    const receiver = byId.get(receiverId);
    if (senderId === clientId) clientMessages++;
    else if (workerId && senderId === workerId) workerMessages++;

    messages.push({
      id: Number(m.id),
      sender_id: senderId,
      sender_username: sender?.username ?? 'Usuario desconocido',
      receiver_id: receiverId,
      receiver_username: receiver?.username ?? 'Usuario desconocido',
      message: String(m.body ?? ''),
      created_at: m.created_at,
      files: [],
    });
  }

  return {
    messages,
    participants: {
      ...(client ? { client } : {}),
      ...(worker ? { worker } : {}),
    },
    stats: {
      total_messages: messages.length,
      client_messages: clientMessages,
      worker_messages: workerMessages,
      files_shared: 0,
    },
  };
}

export function buildDisputeFilesPayload(task: DisputeTaskRow): {
  files: Record<string, unknown[]>;
  summary: Record<string, number>;
} {
  const files = {
    task_files: [] as Array<Record<string, unknown>>,
    chat_files: [] as Array<Record<string, unknown>>,
    delivery_files: [] as Array<Record<string, unknown>>,
  };

  let parsed: unknown[] = [];
  if (task.files) {
    try {
      parsed = typeof task.files === 'string' ? JSON.parse(task.files) : task.files;
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      parsed = [];
    }
  }

  parsed.forEach((entry, index) => {
    const fileData = entry as Record<string, unknown>;
    const filename = String(
      (typeof entry === 'object' && entry !== null
        ? fileData.name ?? fileData.filename
        : entry) ?? `archivo_${index}`,
    );
    let fileUrl = typeof entry === 'object' && entry !== null
      ? String(fileData.url ?? fileData.path ?? '')
      : '';
    if (fileUrl && !/^https?:\/\//i.test(fileUrl)) {
      fileUrl = `/uploads/tasks/${task.id}/${fileUrl.split('/').pop()}`;
    }
    const size = typeof entry === 'object' && entry !== null ? Number(fileData.size ?? 0) : 0;
    files.task_files.push({
      id: index + 1,
      filename,
      url: fileUrl,
      type: mimeFromFilename(filename),
      size,
      size_formatted: size > 0 ? formatFileSize(size) : 'N/A',
      uploaded_at: typeof entry === 'object' && entry !== null ? fileData.uploaded_at ?? null : null,
      uploaded_by: 'client',
    });
  });

  const summary = {
    total_files: files.task_files.length + files.chat_files.length + files.delivery_files.length,
    task_files_count: files.task_files.length,
    chat_files_count: files.chat_files.length,
    delivery_files_count: files.delivery_files.length,
  };

  return { files, summary };
}

export async function buildDisputeTimelinePayload(
  supabase: SupabaseClient,
  dispute: DisputeRow,
  task: DisputeTaskRow,
): Promise<Array<Record<string, unknown>>> {
  const clientId = Number(task.user_id);
  const workerId = task.accepted_applicant_id ? Number(task.accepted_applicant_id) : null;
  const { client, worker, byId } = await loadParticipantUsers(supabase, clientId, workerId);

  let proposalAcceptedAt: string | null = null;
  const { data: app } = await supabase
    .from('arcusx_applications')
    .select('created_at')
    .eq('task_id', task.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (app?.created_at) proposalAcceptedAt = String(app.created_at);

  const timeline: Array<Record<string, unknown>> = [];
  let eventId = 1;

  if (task.created_at) {
    timeline.push({
      id: eventId++,
      type: 'task_created',
      title: 'Tarea creada',
      description: 'El cliente creó la tarea',
      date: task.created_at,
      user: client ? { id: client.id, username: client.username } : null,
    });
  }

  if (proposalAcceptedAt) {
    timeline.push({
      id: eventId++,
      type: 'proposal_accepted',
      title: 'Propuesta aceptada',
      description: 'El cliente aceptó la propuesta del trabajador',
      date: proposalAcceptedAt,
      user: client ? { id: client.id, username: client.username } : null,
    });
  }

  if (task.escrow_created_at) {
    timeline.push({
      id: eventId++,
      type: 'escrow_created',
      title: 'Escrow creado',
      description: 'Contrato escrow creado',
      date: task.escrow_created_at,
      metadata: { contract_id: task.escrow_id ?? null },
    });

    const fundedBase = task.escrow_fund_tx_hash
      ? task.escrow_created_at
      : task.escrow_created_at;
    const fundedDate = new Date(new Date(String(fundedBase)).getTime() + 5 * 60 * 1000)
      .toISOString();
    timeline.push({
      id: eventId++,
      type: 'escrow_funded',
      title: 'Escrow fondeado',
      description: 'Cliente envió fondos al escrow',
      date: fundedDate,
      user: client ? { id: client.id, username: client.username } : null,
      metadata: { contract_id: task.escrow_id ?? null },
    });
  }

  if (Number(task.worker_accepted_completion ?? 0) === 1) {
    const completionDate = dispute.created_at
      ? new Date(new Date(String(dispute.created_at)).getTime() - 86400000).toISOString()
      : new Date().toISOString();
    timeline.push({
      id: eventId++,
      type: 'task_completed',
      title: 'Tarea marcada como completada',
      description: 'El trabajador marcó la tarea como completada',
      date: completionDate,
      user: worker ? { id: worker.id, username: worker.username } : null,
    });
  }

  if (dispute.created_at) {
    const creator = byId.get(Number(dispute.created_by));
    timeline.push({
      id: eventId++,
      type: 'dispute_created',
      title: 'Disputa iniciada',
      description: 'Se inició una disputa',
      date: dispute.created_at,
      user: creator
        ? { id: creator.id, username: creator.username }
        : { id: Number(dispute.created_by), username: 'Usuario' },
      metadata: { reason: dispute.reason ?? null },
    });
  }

  timeline.sort((a, b) =>
    new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime(),
  );
  timeline.forEach((ev, idx) => {
    ev.id = idx + 1;
  });

  return timeline;
}

export function buildResolutionJson(opts: {
  decision: string;
  reason: string;
  resolvedBy: number;
  resolvedByUsername?: string;
  refundPercentage?: number | null;
  taskPrice: number;
}): Record<string, unknown> {
  const { decision, reason, resolvedBy, taskPrice } = opts;
  const data: Record<string, unknown> = {
    decision,
    reason,
    resolved_at: new Date().toISOString(),
    resolved_by: resolvedBy,
    resolved_by_username: opts.resolvedByUsername ?? 'Admin',
  };

  if (decision === 'client') {
    data.refund_to_client = taskPrice;
    data.pay_to_worker = 0;
    data.refund_percentage = 100;
  } else if (decision === 'worker') {
    data.refund_to_client = 0;
    data.pay_to_worker = taskPrice;
    data.refund_percentage = 0;
  } else if (decision === 'split') {
    const pct = Number(opts.refundPercentage ?? 0);
    const refundAmount = Math.round(taskPrice * (pct / 100) * 1e8) / 1e8;
    const payAmount = Math.round((taskPrice - refundAmount) * 1e8) / 1e8;
    data.refund_to_client = refundAmount;
    data.pay_to_worker = payAmount;
    data.refund_percentage = pct;
  }

  return data;
}

export function taskStatusAfterDisputeDecision(decision: string): string {
  return decision === 'client' ? 'cancelled' : 'completed';
}

export function fundsReleaseInfoFromTask(
  task: DisputeTaskRow & {
    client_wallet?: string | null;
    worker_wallet?: string | null;
  },
  decision: string,
  resolution: Record<string, unknown>,
): Record<string, unknown> | null {
  const escrowSt = String(task.escrow_status ?? '');
  const releasable = ['active', 'disputed', 'pending_dispute_resolution'];
  if (!task.escrow_id || !releasable.includes(escrowSt)) return null;
  const taskPrice = Number(task.price ?? 0);
  return {
    escrow_id: task.escrow_id,
    client_wallet: task.client_wallet ?? null,
    worker_wallet: task.worker_wallet ?? null,
    decision,
    needs_refund: decision === 'client',
    needs_payment: decision === 'worker',
    needs_split: decision === 'split',
    refund_amount: decision === 'client'
      ? taskPrice
      : decision === 'split'
      ? Number(resolution.refund_to_client ?? 0)
      : 0,
    payment_amount: decision === 'worker'
      ? taskPrice
      : decision === 'split'
      ? Number(resolution.pay_to_worker ?? 0)
      : 0,
    message:
      'Los fondos del escrow necesitan ser liberados. Firma la transacción en Freighter para completar la liberación.',
  };
}
