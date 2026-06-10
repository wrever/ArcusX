import type { SupabaseClient } from '@supabase/supabase-js';
import { quoteEscrowCommission } from './escrow-fee-quote.ts';
import { normalizePlatformFeeRate } from './platform-fee.ts';
import { countsTowardReleasedVolume } from './released-metrics.ts';

export type VolumeRow = {
  workerAmount: number;
  fundAmount: number;
  platformCommission: number;
  completedAt: string | null;
  source: 'task' | 'deal';
};

function parseNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function taskFundAmount(
  price: number,
  escrowAmount: number | null,
  escrowPlatformFee: number | null,
  defaultFee: number,
): number {
  if (escrowAmount != null && escrowAmount > 0) return escrowAmount;
  const fee = escrowPlatformFee != null ? normalizePlatformFeeRate(escrowPlatformFee) : defaultFee;
  if (price > 0 && fee > 0) {
    try {
      return quoteEscrowCommission(price, fee).fundAmount;
    } catch {
      return price;
    }
  }
  return price;
}

function dealFundAmount(
  amountUsdc: number,
  clientTotal: number | null,
  platformFeeRate: number | null,
  defaultFee: number,
): number {
  if (clientTotal != null && clientTotal > 0) return clientTotal;
  const fee = platformFeeRate != null ? normalizePlatformFeeRate(platformFeeRate) : defaultFee;
  if (amountUsdc > 0) {
    try {
      return quoteEscrowCommission(amountUsdc, fee).fundAmount;
    } catch {
      return amountUsdc;
    }
  }
  return amountUsdc;
}

function platformCommissionFromAmounts(
  workerAmount: number,
  fundAmount: number,
  escrowPlatformFee: number | null,
  defaultFee: number,
): number {
  if (workerAmount <= 0) return 0;
  const fee = escrowPlatformFee != null ? normalizePlatformFeeRate(escrowPlatformFee) : defaultFee;
  try {
    return quoteEscrowCommission(workerAmount, fee).platformCommission;
  } catch {
    return Math.max(0, fundAmount - workerAmount);
  }
}

export function sumVolumeRows(
  rows: VolumeRow[],
  since?: Date | null,
): { volume: number; fees: number; count: number } {
  let volume = 0;
  let fees = 0;
  let count = 0;
  for (const r of rows) {
    if (since && r.completedAt) {
      const t = new Date(r.completedAt).getTime();
      if (Number.isNaN(t) || t < since.getTime()) continue;
    } else if (since && !r.completedAt) {
      continue;
    }
    volume += r.fundAmount;
    fees += r.platformCommission;
    count += 1;
  }
  return {
    volume: Math.round(volume * 1_000_000) / 1_000_000,
    fees: Math.round(fees * 1_000_000) / 1_000_000,
    count,
  };
}

export async function loadReleasedVolumeRows(
  supabase: SupabaseClient,
  defaultFee: number,
): Promise<VolumeRow[]> {
  const rows: VolumeRow[] = [];

  const { data: tasks } = await supabase
    .from('arcusx_tasks')
    .select(
      'price, escrow_amount, escrow_platform_fee, escrow_release_tx_hash, status, escrow_status, escrow_completed_at, completed_at',
    )
    .not('escrow_id', 'is', null);

  for (const t of tasks ?? []) {
    if (!countsTowardReleasedVolume(t)) continue;
    const worker = parseNum(t.price);
    const fund = taskFundAmount(
      worker,
      t.escrow_amount != null ? parseNum(t.escrow_amount) : null,
      t.escrow_platform_fee != null ? parseNum(t.escrow_platform_fee) : null,
      defaultFee,
    );
    const commission = platformCommissionFromAmounts(
      worker,
      fund,
      t.escrow_platform_fee != null ? parseNum(t.escrow_platform_fee) : null,
      defaultFee,
    );
    rows.push({
      workerAmount: worker,
      fundAmount: fund,
      platformCommission: commission,
      completedAt: (t.escrow_completed_at ?? t.completed_at) as string | null,
      source: 'task',
    });
  }

  const { data: deals } = await supabase
    .from('arcusx_agreements')
    .select(
      'amount_usdc, client_total, platform_fee_rate, status, escrow_release_tx_hash, completed_at',
    )
    .eq('status', 'completed');

  for (const d of deals ?? []) {
    if (!countsTowardReleasedVolume(d)) continue;
    const worker = parseNum(d.amount_usdc);
    const fund = dealFundAmount(
      worker,
      d.client_total != null ? parseNum(d.client_total) : null,
      d.platform_fee_rate != null ? parseNum(d.platform_fee_rate) : null,
      defaultFee,
    );
    const commission = platformCommissionFromAmounts(
      worker,
      fund,
      d.platform_fee_rate != null ? parseNum(d.platform_fee_rate) : null,
      defaultFee,
    );
    rows.push({
      workerAmount: worker,
      fundAmount: fund,
      platformCommission: commission,
      completedAt: d.completed_at as string | null,
      source: 'deal',
    });
  }

  return rows;
}

export function periodStarts(): {
  today: Date;
  week: Date;
  month: Date;
} {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const week = new Date(today);
  const day = week.getUTCDay();
  week.setUTCDate(week.getUTCDate() - (day === 0 ? 6 : day - 1));
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return { today, week, month };
}
