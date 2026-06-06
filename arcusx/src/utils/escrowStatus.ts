/** Estados en DB / Edge que permiten aceptar trabajo o liberar fondos */
const FUNDED = new Set(['active', 'completed']);

/** Escrow creado pero aún no fondeado en blockchain */
const PENDING = new Set(['pending_funding', 'pending_signature', 'pending']);

export function isEscrowFunded(status?: string | null): boolean {
  return FUNDED.has((status ?? '').toLowerCase());
}

export function isEscrowPending(status?: string | null): boolean {
  const s = (status ?? '').toLowerCase();
  return !s || PENDING.has(s);
}

/** Tarea con trabajador asignado y aún en curso */
export function isTaskSupervisionActive(status?: string | null): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'assigned' || s === 'in_progress' || s === 'disputed';
}

/**
 * Mapea estados de Trustless Work sin pisar un `active` ya guardado en la plataforma.
 */
export function mergeEscrowStatusFromIndexer(
  dbStatus?: string | null,
  twStatus?: string | null,
): string {
  const db = (dbStatus ?? '').toLowerCase();
  const tw = (twStatus ?? '').toLowerCase();

  if (['disputed', 'resolved', 'refunded', 'completed'].includes(db)) return db;
  if (tw === 'disputed' || tw === 'resolved' || tw === 'refunded') return tw;
  if (db === 'active' || db === 'pending_funding' || db === 'pending_signature') return db;

  if (tw === 'funded' || tw === 'active' || tw === 'funded_escrow') return 'active';
  if (tw === 'initialized' || tw === 'deployed' || tw === 'pending') return 'pending_funding';
  return db || tw || 'pending';
}

export function canClientAcceptOrRejectWork(escrowStatus?: string | null): boolean {
  return isEscrowFunded(escrowStatus);
}

/** Escrow que ya fue fondeado y sigue en curso, disputa o cierre */
const POST_FUNDING = new Set([
  'active',
  'disputed',
  'completed',
  'resolved',
  'pending_dispute_resolution',
]);

/** Supervisión / éxito del flujo solo con escrow fondeado en plataforma */
export function canAccessTaskSupervision(
  escrowId?: string | null,
  escrowStatus?: string | null,
  fundTxHash?: string | null,
): boolean {
  if (!escrowId?.trim()) return false;
  const st = (escrowStatus ?? '').toLowerCase();
  if (!st || isEscrowPending(st)) return false;
  if (!fundTxHash?.trim()) return false;
  return POST_FUNDING.has(st);
}

/** Cliente con trabajador asignado y escrow ya fondeado (incluye disputa) */
export function clientCanSuperviseAcceptedTask(
  acceptedApplicantId?: number | null,
  escrowId?: string | null,
  escrowStatus?: string | null,
  fundTxHash?: string | null,
): boolean {
  if (!acceptedApplicantId) return false;
  return canAccessTaskSupervision(escrowId, escrowStatus, fundTxHash);
}
