import { computeDeletionTargetIso } from './taskDeletionSchedule';

/** Estado on-chain del escrow TW para ofertas privadas enviadas. */

export type PrivateOfferTwRow = {
  balance?: string | number;
  currentBalance?: string | number;
  status?: string;
  contractId?: string;
  id?: string;
  flags?: {
    disputed?: boolean;
    resolved?: boolean;
    released?: boolean;
  };
  isDisputed?: boolean;
  disputed?: boolean;
  isResolved?: boolean;
  resolved?: boolean;
  isReleased?: boolean;
  released?: boolean;
};

export type PrivateOfferChainParsed = {
  isDisputed: boolean;
  isReleased: boolean;
  balance: number;
};

export type SentOfferDisplayPhase =
  | 'awaiting_worker'
  | 'refund_button'
  | 'refund_pending'
  | 'funds_released';

export type SentOfferTaskFields = {
  status: string;
  escrow_id?: string | null;
  escrow_status?: string | null;
  escrow_fund_tx_hash?: string | null;
  escrow_release_tx_hash?: string | null;
  scheduled_deletion_at?: string | null;
  cancellation_tx_hash?: string | null;
  cancellation_requested_at?: string | null;
  escrow_completed_at?: string | null;
  completed_at?: string | null;
  has_accepted_proposal?: boolean;
  accepted_applicant_id?: number | null;
  awaiting_private_worker?: boolean;
};

export function isTrustlessWorkContractId(escrowId?: string | null): boolean {
  return Boolean(escrowId && String(escrowId).trim().startsWith('C'));
}

export function normalizeContractId(id?: string | null): string {
  return String(id ?? '').trim();
}

export function parsePrivateOfferTwRow(
  row: PrivateOfferTwRow | null | undefined,
): PrivateOfferChainParsed {
  if (!row) {
    return { isDisputed: false, isReleased: false, balance: 0 };
  }
  const flags = row.flags ?? {};
  const isDisputed =
    flags.disputed === true ||
    row.isDisputed === true ||
    row.disputed === true;
  const isResolved =
    flags.resolved === true ||
    row.isResolved === true ||
    row.resolved === true ||
    String(row.status ?? '').toLowerCase() === 'resolved';
  const isReleasedFlag =
    flags.released === true ||
    row.isReleased === true ||
    row.released === true ||
    String(row.status ?? '').toLowerCase() === 'released';
  const balance = parseFloat(String(row.balance ?? row.currentBalance ?? '0'));
  const isReleasedFunds = (isResolved || isReleasedFlag) && balance <= 0;
  return {
    isDisputed: isDisputed && !isReleasedFunds,
    isReleased: isReleasedFunds,
    balance,
  };
}

function dbEscrowSt(task: SentOfferTaskFields): string {
  return String(task.escrow_status ?? '').toLowerCase();
}

function hasCancellationStarted(task: SentOfferTaskFields): boolean {
  return (
    Boolean(String(task.cancellation_tx_hash ?? '').trim()) ||
    Boolean(task.cancellation_requested_at)
  );
}

function isRejectedOffer(task: SentOfferTaskFields): boolean {
  const st = String(task.status ?? '').toLowerCase();
  return st === 'private_offer_rejected' || st === 'cancelled';
}

/** Fondos ya liberados (reembolso o trabajo completado). On-chain manda si hay datos. */
export function isSentOfferFundsReleased(
  task: SentOfferTaskFields,
  chain: PrivateOfferChainParsed,
  chainLoaded: boolean,
): boolean {
  const hasTw = isTrustlessWorkContractId(task.escrow_id);
  if (hasTw && chainLoaded && chain.isDisputed) return false;
  if (hasTw && chainLoaded && chain.isReleased) return true;

  const escrowSt = dbEscrowSt(task);
  const taskSt = String(task.status ?? '').toLowerCase();
  const hasReleaseTx = Boolean(String(task.escrow_release_tx_hash ?? '').trim());

  // Sin confirmación on-chain ni tx de liberación: no mostrar "reembolsado"
  if (
    (escrowSt === 'refunded' || escrowSt === 'resolved') &&
    !hasReleaseTx &&
    hasTw &&
    (!chainLoaded || !chain.isReleased)
  ) {
    return false;
  }

  if (escrowSt === 'refunded' && hasReleaseTx) return true;
  if (escrowSt === 'completed' && (hasReleaseTx || taskSt === 'completed')) return true;
  if (
    (escrowSt === 'resolved' || escrowSt === 'refunded') &&
    Boolean(task.scheduled_deletion_at) &&
    hasReleaseTx
  ) {
    return true;
  }
  if (
    taskSt === 'completed' &&
    (escrowSt === 'completed' || escrowSt === 'resolved') &&
    (hasReleaseTx || Boolean(task.scheduled_deletion_at))
  ) {
    return true;
  }
  return false;
}

/** Esperando liberación por arbitraje ArcusX. */
export function isSentOfferRefundPending(
  task: SentOfferTaskFields,
  chain: PrivateOfferChainParsed,
  chainLoaded: boolean,
): boolean {
  if (isSentOfferFundsReleased(task, chain, chainLoaded)) return false;

  const hasTw = isTrustlessWorkContractId(task.escrow_id);
  const hasFundTx = Boolean(String(task.escrow_fund_tx_hash ?? '').trim());
  const escrowSt = dbEscrowSt(task);

  if (hasTw && chainLoaded && chain.isDisputed) return true;
  if (escrowSt === 'disputed' || escrowSt === 'pending_dispute_resolution') return true;
  if (hasCancellationStarted(task)) return true;

  // Oferta rechazada/cancelada con escrow fondeado: en arbitraje hasta liberación real
  if (isRejectedOffer(task) && hasFundTx) {
    const canInitiateRefund =
      String(task.status ?? '').toLowerCase() === 'private_offer_rejected' &&
      !hasCancellationStarted(task) &&
      escrowSt !== 'disputed' &&
      escrowSt !== 'pending_dispute_resolution' &&
      escrowSt !== 'refunded' &&
      escrowSt !== 'resolved' &&
      escrowSt !== 'completed' &&
      !(hasTw && chainLoaded && chain.isDisputed);
    if (canInitiateRefund) return false;
    return true;
  }

  if (isRejectedOffer(task) && hasTw && chainLoaded && chain.balance > 0) return true;

  // BD marcó refunded/resolved sin tx de liberación (desincronizada con on-chain)
  if (
    (escrowSt === 'refunded' || escrowSt === 'resolved') &&
    !Boolean(String(task.escrow_release_tx_hash ?? '').trim())
  ) {
    return true;
  }

  return false;
}

export function shouldShowSentOfferRefundButton(
  task: SentOfferTaskFields,
  chain: PrivateOfferChainParsed,
  chainLoaded: boolean,
): boolean {
  if (String(task.status ?? '').toLowerCase() !== 'private_offer_rejected') return false;
  if (isSentOfferFundsReleased(task, chain, chainLoaded)) return false;
  if (hasCancellationStarted(task)) return false;
  const escrowSt = dbEscrowSt(task);
  if (escrowSt === 'disputed' || escrowSt === 'pending_dispute_resolution') return false;
  if (escrowSt === 'refunded' || escrowSt === 'resolved' || escrowSt === 'completed') return false;
  const hasTw = isTrustlessWorkContractId(task.escrow_id);
  if (hasTw && chainLoaded && (chain.isDisputed || chain.isReleased)) return false;
  return true;
}

export function resolveSentOfferDisplayPhase(
  task: SentOfferTaskFields,
  chain: PrivateOfferChainParsed,
  chainLoaded: boolean,
): SentOfferDisplayPhase | 'active' {
  if (isSentOfferRefundPending(task, chain, chainLoaded)) return 'refund_pending';
  if (isSentOfferFundsReleased(task, chain, chainLoaded)) return 'funds_released';
  if (shouldShowSentOfferRefundButton(task, chain, chainLoaded)) return 'refund_button';
  return 'active';
}

export function sentOfferDeletionScheduleAt(
  task: SentOfferTaskFields,
  windowHours: 12 | 24 = 24,
  onChainFundsReleased = false,
): string | null {
  return computeDeletionTargetIso(
    {
      status: task.status,
      escrow_status: task.escrow_status,
      scheduled_deletion_at: task.scheduled_deletion_at,
      completed_at: task.completed_at,
      escrow_completed_at: task.escrow_completed_at,
      escrow_release_tx_hash: task.escrow_release_tx_hash,
      cancellation_requested_at: task.cancellation_requested_at,
    },
    windowHours,
    { onChainFundsReleased },
  );
}
