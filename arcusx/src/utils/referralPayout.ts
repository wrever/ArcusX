/** Reglas de pago referidos (USDC) */
export const REFERRAL_USDC_PER_VALID = 0.5;
export const REFERRAL_DAILY_CAP_USDC = 20;
export const REFERRAL_WEEKLY_CAP_USDC = 100;

export type ReferralGroupBy = 'day' | 'week' | 'month';

export function payoutForDay(validCount: number): number {
  return Math.min(validCount * REFERRAL_USDC_PER_VALID, REFERRAL_DAILY_CAP_USDC);
}

export function payoutForWeek(validCount: number): number {
  return Math.min(validCount * REFERRAL_USDC_PER_VALID, REFERRAL_WEEKLY_CAP_USDC);
}

export function weekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function formatPeriodLabel(key: string, groupBy: ReferralGroupBy): string {
  if (groupBy === 'month') {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
  }
  if (groupBy === 'week') {
    return `Semana desde ${new Date(`${key}T12:00:00Z`).toLocaleDateString('es-ES')}`;
  }
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export interface TimelineRow {
  period_key: string;
  period_label: string;
  valid_count: number;
  payout_usdc: number;
}

/** Agrupa conteos diarios y aplica topes de pago. */
export function buildPayoutTimeline(
  dailyCounts: Map<string, number>,
  groupBy: ReferralGroupBy,
): TimelineRow[] {
  if (groupBy === 'day') {
    return [...dailyCounts.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, count]) => ({
        period_key: date,
        period_label: formatPeriodLabel(date, 'day'),
        valid_count: count,
        payout_usdc: payoutForDay(count),
      }));
  }

  if (groupBy === 'week') {
    const weekTotals = new Map<string, number>();
    const weekPayoutFromDays = new Map<string, number>();

    for (const [date, count] of dailyCounts) {
      const wk = weekKey(date);
      weekTotals.set(wk, (weekTotals.get(wk) ?? 0) + count);
      const dayPay = payoutForDay(count);
      weekPayoutFromDays.set(wk, (weekPayoutFromDays.get(wk) ?? 0) + dayPay);
    }

    return [...weekTotals.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([wk, count]) => {
        const fromDays = weekPayoutFromDays.get(wk) ?? 0;
        const capped = Math.min(fromDays, payoutForWeek(count), REFERRAL_WEEKLY_CAP_USDC);
        return {
          period_key: wk,
          period_label: formatPeriodLabel(wk, 'week'),
          valid_count: count,
          payout_usdc: Math.round(capped * 100) / 100,
        };
      });
  }

  const monthDayPayouts = new Map<string, number>();
  const monthTotals = new Map<string, number>();

  for (const [date, count] of dailyCounts) {
    const mk = monthKey(date);
    monthTotals.set(mk, (monthTotals.get(mk) ?? 0) + count);
    monthDayPayouts.set(mk, (monthDayPayouts.get(mk) ?? 0) + payoutForDay(count));
  }

  return [...monthTotals.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mk, count]) => ({
      period_key: mk,
      period_label: formatPeriodLabel(mk, 'month'),
      valid_count: count,
      payout_usdc: Math.round((monthDayPayouts.get(mk) ?? 0) * 100) / 100,
    }));
}
