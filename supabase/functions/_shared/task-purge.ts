import type { SupabaseClient } from '@supabase/supabase-js';
import { parseTaskExchangeFiles } from './task-exchange-files.ts';

async function removeStoragePaths(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  const chunk = 50;
  for (let i = 0; i < unique.length; i += chunk) {
    await supabase.storage.from(bucket).remove(unique.slice(i, i + chunk));
  }
}

function pathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

async function collectTaskFileStoragePaths(
  supabase: SupabaseClient,
  taskId: number,
  filesField: unknown,
): Promise<string[]> {
  const paths: string[] = [];
  const prefix = `${taskId}/`;

  for (const file of parseTaskExchangeFiles(filesField)) {
    const url = typeof file.url === 'string' ? file.url : '';
    const fromUrl = url ? pathFromPublicUrl(url, 'task-files') : null;
    if (fromUrl) paths.push(fromUrl);
    const filename = typeof file.filename === 'string' ? file.filename : '';
    if (filename) paths.push(`${prefix}${filename}`);
  }

  const { data: listed } = await supabase.storage.from('task-files').list(prefix, { limit: 200 });
  for (const entry of listed ?? []) {
    if (entry.name) paths.push(`${prefix}${entry.name}`);
  }

  return paths;
}

async function collectEvidenceStoragePaths(
  supabase: SupabaseClient,
  taskId: number,
): Promise<string[]> {
  const paths: string[] = [];
  const { data: rows } = await supabase
    .from('arcusx_milestone_evidence')
    .select('files')
    .eq('task_id', taskId);

  for (const row of rows ?? []) {
    const files = row.files;
    if (!Array.isArray(files)) continue;
    for (const raw of files) {
      const f = raw as Record<string, unknown>;
      if (typeof f.path === 'string' && f.path.trim()) {
        paths.push(f.path.trim());
        continue;
      }
      const url = typeof f.url === 'string' ? f.url : '';
      const fromUrl = url ? pathFromPublicUrl(url, 'milestone-evidence') : null;
      if (fromUrl) paths.push(fromUrl);
    }
  }

  const prefix = String(taskId);
  const { data: level1 } = await supabase.storage.from('milestone-evidence').list(prefix, { limit: 100 });
  for (const entry of level1 ?? []) {
    const sub = `${prefix}/${entry.name}`;
    const { data: level2 } = await supabase.storage.from('milestone-evidence').list(sub, { limit: 100 });
    if (level2?.length) {
      for (const f of level2) {
        if (f.name) paths.push(`${sub}/${f.name}`);
      }
    } else if (entry.name) {
      paths.push(sub);
    }
  }

  return paths;
}

/** Elimina mensajes, archivos en storage, ratings y la tarea (CASCADE en el resto). */
export async function purgeTaskAndRelated(
  supabase: SupabaseClient,
  taskId: number,
  filesField?: unknown,
): Promise<void> {
  const taskFilePaths = await collectTaskFileStoragePaths(supabase, taskId, filesField);
  const evidencePaths = await collectEvidenceStoragePaths(supabase, taskId);

  await removeStoragePaths(supabase, 'task-files', taskFilePaths);
  await removeStoragePaths(supabase, 'milestone-evidence', evidencePaths);

  await supabase.from('arcusx_task_messages').delete().eq('task_id', taskId);
  await supabase.from('arcusx_ratings').delete().eq('task_id', taskId);

  const { error } = await supabase.from('arcusx_tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
}

export function scheduledDeletionAtFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

const DELETION_HOUR_MS = 60 * 60 * 1000;

function parseTs(value?: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

type TaskDeletionRow = {
  id: number;
  status?: string | null;
  escrow_status?: string | null;
  scheduled_deletion_at?: string | null;
  completed_at?: string | null;
  escrow_completed_at?: string | null;
  escrow_release_tx_hash?: string | null;
  cancellation_requested_at?: string | null;
};

function isDeletionScheduleStalePreRelease(
  task: TaskDeletionRow,
  windowHours: number,
  disputeResolvedAt: string | null,
): boolean {
  const hasRelease = Boolean(String(task.escrow_release_tx_hash ?? '').trim());
  if (!hasRelease) return false;

  const escrowSt = String(task.escrow_status ?? '').toLowerCase();
  if (escrowSt !== 'refunded' && escrowSt !== 'resolved' && escrowSt !== 'completed') {
    return false;
  }

  const STALE_MS = 5 * 60 * 1000;
  const schedMs = parseTs(task.scheduled_deletion_at);
  const closedMs = parseTs(task.escrow_completed_at) ?? parseTs(task.completed_at);
  const cancelMs = parseTs(task.cancellation_requested_at);
  const disputeMs = parseTs(disputeResolvedAt);

  if (schedMs == null || closedMs == null) return false;

  if (cancelMs && Math.abs(closedMs - cancelMs) < STALE_MS) {
    if (Math.abs(schedMs - (cancelMs + windowHours * DELETION_HOUR_MS)) < STALE_MS) {
      return true;
    }
  }

  if (disputeMs && windowHours === 24 && Math.abs(closedMs - disputeMs) < STALE_MS) {
    const disputeWindowHours = 12;
    if (
      Math.abs(schedMs - (disputeMs + disputeWindowHours * DELETION_HOUR_MS)) < STALE_MS
    ) {
      return true;
    }
  }

  return false;
}

type EnsureDeletionResult = {
  scheduled_deletion_at: string | null;
  dispute_resolved_at: string | null;
  escrow_completed_at?: string | null;
  completed_at?: string | null;
};

function scheduleMatchesClosure(
  schedMs: number,
  closedMs: number,
  windowHours: number,
): boolean {
  return Math.abs(schedMs - (closedMs + windowHours * DELETION_HOUR_MS)) < 5 * 60 * 1000;
}

/** Fija scheduled_deletion_at en BD a partir de fechas reales (no "ahora"). */
export async function ensureTaskScheduledDeletion(
  supabase: SupabaseClient,
  task: TaskDeletionRow,
): Promise<EnsureDeletionResult> {
  let disputeResolvedAt: string | null = null;

  const { data: resolvedDispute } = await supabase
    .from('arcusx_disputes')
    .select('resolved_at')
    .eq('task_id', task.id)
    .eq('status', 'resolved')
    .not('resolved_at', 'is', null)
    .order('resolved_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  disputeResolvedAt = resolvedDispute?.resolved_at
    ? String(resolvedDispute.resolved_at)
    : null;

  const status = String(task.status ?? '').toLowerCase();
  const escrowSt = String(task.escrow_status ?? '').toLowerCase();
  const hasReleaseTx = Boolean(String(task.escrow_release_tx_hash ?? '').trim());

  const existing = task.scheduled_deletion_at;
  const existingMs = parseTs(existing);
  if (existingMs != null) {
    const refundWindowHours =
      escrowSt === 'refunded' || status === 'cancelled' ? 24 : 12;
    const windowForStale =
      escrowSt === 'refunded' ? 24 : escrowSt === 'resolved' || status === 'resolved' ? 12 : 24;

    const closedMs = parseTs(task.escrow_completed_at) ?? parseTs(task.completed_at);
    if (
      closedMs != null &&
      scheduleMatchesClosure(existingMs, closedMs, refundWindowHours)
    ) {
      return {
        scheduled_deletion_at: existing,
        dispute_resolved_at: disputeResolvedAt,
        escrow_completed_at: task.escrow_completed_at ?? null,
        completed_at: task.completed_at ?? null,
      };
    }

    if (isDeletionScheduleStalePreRelease(task, windowForStale, disputeResolvedAt)) {
      const releasedAt = new Date().toISOString();
      const scheduled = scheduledDeletionAtFromNow(refundWindowHours);
      await supabase
        .from('arcusx_tasks')
        .update({
          scheduled_deletion_at: scheduled,
          escrow_completed_at: releasedAt,
          completed_at: task.completed_at ?? releasedAt,
          updated_at: releasedAt,
        })
        .eq('id', task.id);
      return {
        scheduled_deletion_at: scheduled,
        dispute_resolved_at: disputeResolvedAt,
        escrow_completed_at: releasedAt,
        completed_at: task.completed_at ?? releasedAt,
      };
    }

    if (hasReleaseTx && closedMs != null) {
      const expectedMs = closedMs + refundWindowHours * DELETION_HOUR_MS;
      if (existingMs < expectedMs - 5 * 60 * 1000) {
        const scheduled = new Date(expectedMs).toISOString();
        await supabase
          .from('arcusx_tasks')
          .update({
            scheduled_deletion_at: scheduled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', task.id);
        return {
          scheduled_deletion_at: scheduled,
          dispute_resolved_at: disputeResolvedAt,
          escrow_completed_at: task.escrow_completed_at ?? null,
          completed_at: task.completed_at ?? null,
        };
      }
    }

    return {
      scheduled_deletion_at: existing,
      dispute_resolved_at: disputeResolvedAt,
      escrow_completed_at: task.escrow_completed_at ?? null,
      completed_at: task.completed_at ?? null,
    };
  }

  if (escrowSt === 'disputed' || escrowSt === 'pending_dispute_resolution') {
    return { scheduled_deletion_at: null, dispute_resolved_at: disputeResolvedAt };
  }

  const resolvedClosure =
    escrowSt === 'resolved' ||
    status === 'resolved' ||
    Boolean(disputeResolvedAt);
  const completedClosure =
    !resolvedClosure &&
    (status === 'completed' ||
      escrowSt === 'completed' ||
      Boolean(String(task.escrow_release_tx_hash ?? '').trim()));

  if (!resolvedClosure && !completedClosure) {
    return { scheduled_deletion_at: null, dispute_resolved_at: disputeResolvedAt };
  }

  const windowHours = resolvedClosure ? 12 : 24;

  let closedMs =
    parseTs(task.escrow_completed_at) ??
    parseTs(task.completed_at) ??
    parseTs(disputeResolvedAt);

  if (closedMs == null) {
    return { scheduled_deletion_at: null, dispute_resolved_at: disputeResolvedAt };
  }

  const scheduled = new Date(closedMs + windowHours * DELETION_HOUR_MS).toISOString();
  const patch: Record<string, unknown> = {
    scheduled_deletion_at: scheduled,
    updated_at: new Date().toISOString(),
  };
  if (!task.escrow_completed_at) {
    patch.escrow_completed_at = new Date(closedMs).toISOString();
  }

  await supabase.from('arcusx_tasks').update(patch).eq('id', task.id);

  return { scheduled_deletion_at: scheduled, dispute_resolved_at: disputeResolvedAt };
}
