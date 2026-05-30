import type { SupabaseClient } from '@supabase/supabase-js';

export async function getPlatformFee(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  const v = Number(data?.config_value);
  return Number.isFinite(v) ? v : 0.03;
}

export function parseSkills(raw: unknown): Array<{ name: string; level: string }> {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => {
      if (typeof s === 'string') return { name: s, level: 'intermediate' };
      const o = s as { name?: string; level?: string };
      return { name: String(o.name ?? ''), level: String(o.level ?? 'intermediate') };
    }).filter((s) => s.name);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseSkills(parsed);
    } catch {
      /* comma-separated fallback */
    }
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
      .map((name) => ({ name, level: 'intermediate' }));
  }
  return [];
}

export function isPublicProfile(value: unknown): boolean {
  return value !== false && value !== 0 && value !== '0';
}

type TaskRow = {
  user_id?: number | null;
  accepted_applicant_id?: number | null;
  status?: string | null;
  escrow_status?: string | null;
  escrow_id?: string | null;
  price?: number | null;
  escrow_amount?: number | null;
  escrow_platform_fee?: number | null;
};

export function isStrictCompletedTask(t: TaskRow): boolean {
  return t.status === 'completed' && t.escrow_status === 'completed';
}

export function isTransactionTask(t: TaskRow): boolean {
  if (t.status !== 'completed') return false;
  if (t.escrow_status === 'completed') return true;
  if (t.escrow_id && t.escrow_status !== 'refunded') return true;
  return false;
}

export function formatAmount(n: number): string {
  return n.toFixed(7);
}

export function calcNetAmount(
  type: 'paid' | 'received',
  price: number,
  escrowAmount: number | null | undefined,
  platformFee: number,
): number {
  if (type === 'received') return price;
  if (escrowAmount != null && Number(escrowAmount) > 0) return Number(escrowAmount);
  return price / (1 - platformFee);
}

export async function computeUserPublicStats(
  supabase: SupabaseClient,
  userId: number,
): Promise<Record<string, unknown>> {
  const platformFee = await getPlatformFee(supabase);

  const { data: user } = await supabase
    .from('arcusx_users')
    .select('average_rating, total_ratings')
    .eq('id', userId)
    .maybeSingle();

  const [{ count: tasksCreated }, { data: workerTasks }, { data: clientTasks }] = await Promise.all([
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('arcusx_tasks')
      .select('price, escrow_amount, escrow_platform_fee')
      .eq('accepted_applicant_id', userId)
      .eq('status', 'completed')
      .eq('escrow_status', 'completed'),
    supabase.from('arcusx_tasks')
      .select('price, escrow_amount, escrow_platform_fee')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .eq('escrow_status', 'completed'),
  ]);

  const tasksCompleted = workerTasks?.length ?? 0;

  let totalEarned = 0;
  for (const t of workerTasks ?? []) {
    const price = Number(t.price ?? 0);
    const escrowAmount = t.escrow_amount != null ? Number(t.escrow_amount) : null;
    const fee = Number(t.escrow_platform_fee ?? platformFee);
    if (escrowAmount != null && t.escrow_platform_fee != null) {
      totalEarned += price || escrowAmount * (1 - fee);
    } else {
      totalEarned += price;
    }
  }

  let totalSpent = 0;
  for (const t of clientTasks ?? []) {
    const price = Number(t.price ?? 0);
    const escrowAmount = t.escrow_amount != null ? Number(t.escrow_amount) : null;
    const fee = Number(t.escrow_platform_fee ?? platformFee);
    if (escrowAmount != null) {
      totalSpent += escrowAmount;
    } else if (t.escrow_platform_fee != null) {
      totalSpent += price / (1 - fee);
    } else {
      totalSpent += price / (1 - platformFee);
    }
  }

  const completedAsClient = clientTasks?.length ?? 0;
  const created = tasksCreated ?? 0;
  const completionRate = created > 0
    ? Math.round((completedAsClient / created) * 10000) / 100
    : 0;

  return {
    tasks_completed: tasksCompleted,
    tasks_created: created,
    total_earned: totalEarned,
    total_spent: totalSpent,
    average_rating: Number(user?.average_rating ?? 0),
    total_ratings: Number(user?.total_ratings ?? 0),
    completion_rate: completionRate,
    response_time_avg: null,
  };
}
