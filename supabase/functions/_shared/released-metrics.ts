/** Campos mínimos en BD para que admin/hero cuenten volumen y fees tras liberar on-chain. */

export function releasedAtIso(): string {
  return new Date().toISOString();
}

export function taskReleaseMetricsPatch(
  txHash: string,
  opts?: { isRefund?: boolean; status?: string },
): Record<string, unknown> {
  const at = releasedAtIso();
  const patch: Record<string, unknown> = {
    escrow_release_tx_hash: txHash,
    escrow_completed_at: at,
    updated_at: at,
  };
  if (opts?.isRefund) {
    patch.escrow_status = 'refunded';
  } else {
    patch.escrow_status = 'resolved';
    patch.completed_at = at;
    if (opts?.status) patch.status = opts.status;
  }
  return patch;
}

export function dealReleaseMetricsPatch(
  txHash: string,
  opts?: { isRefund?: boolean; status?: string },
): Record<string, unknown> {
  const at = releasedAtIso();
  const patch: Record<string, unknown> = {
    escrow_release_tx_hash: txHash,
    escrow_tx_hash: txHash,
    updated_at: at,
  };
  if (opts?.isRefund) {
    patch.escrow_status = 'refunded';
    patch.status = opts?.status ?? 'cancelled';
  } else {
    patch.escrow_status = 'resolved';
    patch.status = opts?.status ?? 'completed';
    patch.completed_at = at;
  }
  return patch;
}

/** Excluir reembolsos/cancelaciones del volumen de plataforma. */
export function countsTowardReleasedVolume(row: {
  escrow_release_tx_hash?: string | null;
  status?: string | null;
  escrow_status?: string | null;
}): boolean {
  const tx = String(row.escrow_release_tx_hash ?? '').trim();
  if (!tx) {
    const st = String(row.status ?? '');
    const escrowSt = String(row.escrow_status ?? '');
    return st === 'completed' && escrowSt === 'completed';
  }
  const escrowSt = String(row.escrow_status ?? '').toLowerCase();
  const st = String(row.status ?? '').toLowerCase();
  if (escrowSt === 'refunded') return false;
  if (st === 'cancelled' && escrowSt !== 'resolved') return false;
  return true;
}
