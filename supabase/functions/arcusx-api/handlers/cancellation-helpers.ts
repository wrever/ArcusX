import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { taskHasExchangeFiles } from '../../_shared/task-exchange-files.ts';
import { getPlatformFee } from './stats-helpers.ts';
import { quoteEscrowFundAmount } from '../../_shared/escrow-fee-quote.ts';

export type TaskCancelRow = {
  files?: unknown;
  escrow_amount?: number | string | null;
  price?: number | string | null;
  escrow_platform_fee?: number | string | null;
};

/** Si hay archivos en el intercambio, el cliente debe usar disputa (no cancelar/reembolsar directo). */
export function taskCancellationRequiresDispute(task: TaskCancelRow): boolean {
  return taskHasExchangeFiles(task);
}

/** @deprecated Usar taskCancellationRequiresDispute */
export function workerRequiresDispute(task: TaskCancelRow): boolean {
  return taskCancellationRequiresDispute(task);
}

/** Monto USDC a reembolsar (total depositado en escrow). */
export async function computeTaskRefundAmount(
  task: TaskCancelRow,
  supabase: SupabaseClient,
): Promise<number> {
  const escrowAmount = Number(task.escrow_amount);
  if (Number.isFinite(escrowAmount) && escrowAmount > 0) {
    return Math.round(escrowAmount * 1e7) / 1e7;
  }
  const price = Number(task.price);
  if (!Number.isFinite(price) || price <= 0) return 0;
  const fee = Number(task.escrow_platform_fee ?? await getPlatformFee(supabase));
  const rate = fee > 0 && fee < 1 ? fee : 0.027;
  return Math.round(quoteEscrowFundAmount(price, rate) * 1e7) / 1e7;
}
