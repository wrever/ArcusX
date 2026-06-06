const HOUR_MS = 60 * 60 * 1000;
const STALE_TOLERANCE_MS = 5 * 60 * 1000;

export type TaskDeletionFields = {
  status?: string | null;
  escrow_status?: string | null;
  scheduled_deletion_at?: string | null;
  completed_at?: string | null;
  escrow_completed_at?: string | null;
  escrow_release_tx_hash?: string | null;
  client_accepted_completion?: number | boolean | null;
  /** Fecha estable de resolución de disputa (API) */
  dispute_resolved_at?: string | null;
  cancellation_requested_at?: string | null;
};

export type TaskClosureHints = {
  taskFundsReleased?: boolean;
  isResolved?: boolean;
  isRefunded?: boolean;
  taskInDispute?: boolean;
  /** Fondos liberados verificados on-chain (TW), aunque BD esté desincronizada */
  onChainFundsReleased?: boolean;
};

export type TaskDeletionSchedule = {
  targetMs: number;
  windowHours: 12 | 24;
  closedAtMs: number;
};

function parseTs(value?: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function deletionWindowHours(
  status: string,
  escrowStatus: string,
): 12 | 24 {
  if (escrowStatus === 'resolved' || status === 'resolved') return 12;
  return 24;
}

/** Tarea terminada: fondos liberados, disputa resuelta o reembolso confirmado. */
export function isTaskFullyClosed(
  task: TaskDeletionFields,
  hints: TaskClosureHints = {},
): boolean {
  const status = String(task.status ?? '').toLowerCase();
  const escrowStatus = String(task.escrow_status ?? '').toLowerCase();
  const isResolvedState =
    hints.isResolved === true ||
    status === 'resolved' ||
    escrowStatus === 'resolved';

  if (hints.taskInDispute && !isResolvedState) return false;

  if (hints.onChainFundsReleased === true) {
    return true;
  }

  if (isResolvedState) {
    return true;
  }

  if (
    hints.isRefunded &&
    (escrowStatus === 'resolved' || status === 'cancelled' || status === 'resolved')
  ) {
    return true;
  }

  if (status === 'cancelled' && (hints.isRefunded || hints.isResolved)) {
    return true;
  }

  if (
    (status === 'cancelled' || status === 'private_offer_rejected') &&
    (escrowStatus === 'refunded' || escrowStatus === 'resolved') &&
    Boolean(task.scheduled_deletion_at)
  ) {
    return true;
  }

  const fundsReleased =
    hints.taskFundsReleased === true ||
    status === 'completed' ||
    escrowStatus === 'completed' ||
    Boolean(String(task.escrow_release_tx_hash ?? '').trim());

  if (!fundsReleased) return false;

  return (
    Boolean(task.escrow_release_tx_hash) ||
    Number(task.client_accepted_completion) === 1 ||
    status === 'completed'
  );
}

/** Schedule anclado a cancelación/disputa previa al reembolso on-chain real. */
export function isDeletionScheduleStalePreRelease(
  task: TaskDeletionFields,
  windowHours: 12 | 24,
): boolean {
  const hasRelease = Boolean(String(task.escrow_release_tx_hash ?? '').trim());
  if (!hasRelease) return false;

  const escrowStatus = String(task.escrow_status ?? '').toLowerCase();
  if (
    escrowStatus !== 'refunded' &&
    escrowStatus !== 'resolved' &&
    escrowStatus !== 'completed'
  ) {
    return false;
  }

  const schedMs = parseTs(task.scheduled_deletion_at);
  const closedMs =
    parseTs(task.escrow_completed_at) ?? parseTs(task.completed_at);
  const cancelMs = parseTs(task.cancellation_requested_at);
  const disputeMs = parseTs(task.dispute_resolved_at);

  if (schedMs == null || closedMs == null) return false;

  if (cancelMs && Math.abs(closedMs - cancelMs) < STALE_TOLERANCE_MS) {
    if (Math.abs(schedMs - (cancelMs + windowHours * HOUR_MS)) < STALE_TOLERANCE_MS) {
      return true;
    }
  }

  if (disputeMs && windowHours === 24 && Math.abs(closedMs - disputeMs) < STALE_TOLERANCE_MS) {
    const disputeWindowHours = 12;
    if (
      Math.abs(schedMs - (disputeMs + disputeWindowHours * HOUR_MS)) <
      STALE_TOLERANCE_MS
    ) {
      return true;
    }
  }

  return false;
}

export function computeDeletionTargetIso(
  task: TaskDeletionFields,
  windowHours: 12 | 24,
  hints: TaskClosureHints = {},
): string | null {
  const hasRelease =
    Boolean(String(task.escrow_release_tx_hash ?? '').trim()) ||
    hints.onChainFundsReleased === true;

  if (hasRelease && isDeletionScheduleStalePreRelease(task, windowHours)) {
    return new Date(Date.now() + windowHours * HOUR_MS).toISOString();
  }

  const closedMs =
    parseTs(task.escrow_completed_at) ??
    parseTs(task.completed_at) ??
    parseTs(task.dispute_resolved_at);

  if (hasRelease && closedMs != null) {
    const expectedMs = closedMs + windowHours * HOUR_MS;
    const schedMs = parseTs(task.scheduled_deletion_at);
    if (schedMs == null || schedMs < expectedMs - STALE_TOLERANCE_MS) {
      return new Date(expectedMs).toISOString();
    }
    return task.scheduled_deletion_at!;
  }

  if (task.scheduled_deletion_at) return task.scheduled_deletion_at;
  if (closedMs == null) {
    if (hints.onChainFundsReleased === true) {
      return new Date(Date.now() + windowHours * HOUR_MS).toISOString();
    }
    return null;
  }

  return new Date(closedMs + windowHours * HOUR_MS).toISOString();
}

export function getTaskDeletionSchedule(
  task: TaskDeletionFields,
  hints: TaskClosureHints = {},
): TaskDeletionSchedule | null {
  const status = String(task.status ?? '').toLowerCase();
  const escrowStatus = String(task.escrow_status ?? '').toLowerCase();
  const windowHours = deletionWindowHours(status, escrowStatus);

  if (!task.scheduled_deletion_at && !isTaskFullyClosed(task, hints)) return null;

  const targetIso = computeDeletionTargetIso(task, windowHours, hints);
  if (!targetIso) return null;

  const targetMs = parseTs(targetIso);
  if (targetMs == null) return null;

  const closedMs =
    parseTs(task.escrow_completed_at) ??
    parseTs(task.completed_at) ??
    parseTs(task.dispute_resolved_at) ??
    targetMs - windowHours * HOUR_MS;

  return {
    targetMs,
    windowHours,
    closedAtMs: closedMs,
  };
}

export function formatCountdownParts(remainingMs: number): {
  hours: string;
  minutes: string;
  seconds: string;
  done: boolean;
} {
  if (remainingMs <= 0) {
    return { hours: '00', minutes: '00', seconds: '00', done: true };
  }
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return {
    hours: String(h).padStart(2, '0'),
    minutes: String(m).padStart(2, '0'),
    seconds: String(s).padStart(2, '0'),
    done: false,
  };
}

export function formatCountdownCompact(remainingMs: number): string {
  const { hours, minutes, seconds, done } = formatCountdownParts(remainingMs);
  if (done) return '0m';
  if (hours !== '00') return `${Number(hours)}h ${minutes}m ${seconds}s`;
  if (minutes !== '00') return `${Number(minutes)}m ${seconds}s`;
  return `${Number(seconds)}s`;
}
