import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';

export interface TaskEscrowStatusRow {
  escrow_id: string | null;
  escrow_status: string | null;
  task_status: string | null;
  escrow_created_at: string | null;
  escrow_completed_at: string | null;
  task_id: number;
  client_id: number;
  worker_id: number | null;
  escrow_amount: number | null;
  price: number | null;
  worker_started_at: string | null;
  worker_accepted_completion: boolean;
  client_accepted_completion: boolean;
  cancellation_allowed: boolean | null;
  balance: number | null;
  balance_source: 'trustless_work_indexer' | 'database_only';
  indexer_status?: string | null;
  is_disputed?: boolean;
}

type IndexerEscrow = {
  balance?: string | number;
  currentBalance?: string | number;
  status?: string;
  isDisputed?: boolean;
  disputed?: boolean;
};

/**
 * Estado de escrow en BD (Edge `get_escrow_status`).
 */
export async function fetchTaskEscrowStatus(params: {
  taskId?: number;
  escrowId?: string;
}): Promise<TaskEscrowStatusRow> {
  const query: Record<string, string | number> = {};
  if (params.taskId) query.task_id = params.taskId;
  else if (params.escrowId) query.escrow_id = params.escrowId;
  else throw new Error('task_id o escrow_id requerido');

  const res = await fetch(arcusxApiUrl('get_escrow_status', query), {
    headers: arcusxApiHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'No se pudo obtener el estado del escrow');
  }
  const e = data.escrow ?? {};
  return {
    escrow_id: e.escrow_id ?? null,
    escrow_status: e.escrow_status ?? null,
    task_status: e.task_status ?? null,
    escrow_created_at: e.escrow_created_at ?? null,
    escrow_completed_at: e.escrow_completed_at ?? null,
    task_id: Number(e.task_id),
    client_id: Number(e.client_id),
    worker_id: e.worker_id != null ? Number(e.worker_id) : null,
    escrow_amount: e.escrow_amount != null ? Number(e.escrow_amount) : null,
    price: e.price != null ? Number(e.price) : null,
    worker_started_at: e.worker_started_at ?? null,
    worker_accepted_completion: Boolean(e.worker_accepted_completion),
    client_accepted_completion: Boolean(e.client_accepted_completion),
    cancellation_allowed: e.cancellation_allowed ?? null,
    balance: e.balance != null ? Number(e.balance) : null,
    balance_source: e.balance_source ?? 'database_only',
    indexer_status: e.indexer_status ?? null,
    is_disputed: e.is_disputed,
  };
}

/**
 * BD + balance on-chain vía indexer Trustless Work (mismo contrato que supervisión).
 */
export async function fetchTaskEscrowStatusWithIndexer(
  params: { taskId?: number; escrowId?: string },
  getEscrowByContractIds: (opts: {
    contractIds: string[];
    validateOnChain?: boolean;
  }) => Promise<unknown>,
): Promise<TaskEscrowStatusRow> {
  const row = await fetchTaskEscrowStatus(params);
  const contractId = row.escrow_id;
  if (!contractId) return row;

  try {
    const raw = await getEscrowByContractIds({
      contractIds: [contractId],
      validateOnChain: true,
    });
    const escrows = Array.isArray(raw)
      ? raw
      : (raw as { escrows?: IndexerEscrow[] })?.escrows ?? [];
    const escrow = escrows[0] as IndexerEscrow | undefined;
    if (!escrow) return row;

    const balance = parseFloat(
      String(escrow.balance ?? escrow.currentBalance ?? '0'),
    );
    return {
      ...row,
      balance: Number.isFinite(balance) ? balance : null,
      balance_source: 'trustless_work_indexer',
      indexer_status: escrow.status ?? null,
      is_disputed:
        escrow.isDisputed === true ||
        escrow.disputed === true ||
        String(escrow.status ?? '').toLowerCase() === 'disputed',
    };
  } catch {
    return row;
  }
}

export async function markWorkStarted(taskId: number): Promise<{
  message: string;
  already_marked?: boolean;
  started_at?: string;
}> {
  const res = await fetch(arcusxApiUrl('mark_work_started'), {
    method: 'POST',
    headers: arcusxApiHeaders(),
    body: JSON.stringify({ task_id: taskId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'No se pudo marcar el inicio del trabajo');
  }
  return {
    message: data.message,
    already_marked: data.already_marked,
    started_at: data.started_at,
  };
}
