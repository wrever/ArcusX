import type { SupabaseClient } from '@supabase/supabase-js';
import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import type { ApiContext } from './types.ts';
import { qpInt } from './types.ts';
import { requireUser } from './require.ts';
import { uploadMilestoneEvidenceFiles } from './storage-helpers.ts';

export async function getMilestoneEvidence(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const taskId = qpInt(url, 'task_id');
  const milestoneIndex = Number(url.searchParams.get('milestone_index') ?? 0);
  if (!taskId) return jsonError(req, 'task_id requerido', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, accepted_applicant_id')
    .eq('id', taskId)
    .single();
  if (!task) return jsonError(req, 'Tarea no encontrada', 404);

  const allowed =
    task.user_id === auth.userId || task.accepted_applicant_id === auth.userId;
  if (!allowed) return jsonError(req, 'No autorizado', 403);

  const { data, error } = await auth.supabase
    .from('arcusx_milestone_evidence')
    .select('id, task_id, milestone_index, user_id, note, files, created_at, updated_at')
    .eq('task_id', taskId)
    .eq('milestone_index', milestoneIndex)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);

  const evidence = data
    ? { ...data, files: await signEvidenceFiles(auth.supabase, data.files) }
    : null;
  return jsonSuccess(req, { evidence });
}

async function signEvidenceFiles(
  supabase: SupabaseClient,
  files: unknown,
): Promise<unknown[]> {
  if (!Array.isArray(files)) return [];
  const out: unknown[] = [];
  for (const raw of files) {
    const f = raw as Record<string, unknown>;
    const path = typeof f.path === 'string' ? f.path : null;
    let url = typeof f.url === 'string' ? f.url : '';
    if (path) {
      const { data: signed } = await supabase.storage
        .from('milestone-evidence')
        .createSignedUrl(path, 60 * 60 * 24);
      if (signed?.signedUrl) url = signed.signedUrl;
    }
    out.push({ ...f, url });
  }
  return out;
}

export async function uploadMilestoneEvidence(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const form = await req.formData();
  const taskId = Number(form.get('task_id'));
  const milestoneIndex = Number(form.get('milestone_index') ?? 0);
  const note = String(form.get('note') ?? form.get('evidence') ?? '').trim();

  if (!taskId || !Number.isFinite(taskId)) {
    return jsonError(req, 'task_id requerido', 400);
  }

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, accepted_applicant_id, status, title')
    .eq('id', taskId)
    .single();

  if (!task) return jsonError(req, 'Tarea no encontrada', 404);
  if (task.accepted_applicant_id !== auth.userId) {
    return jsonError(req, 'Solo el freelancer asignado puede subir evidencia', 403);
  }
  if (task.status === 'completed' || task.status === 'cancelled') {
    return jsonError(req, 'La tarea ya no acepta evidencia', 400);
  }

  const uploadFiles: File[] = [];
  for (const [key, value] of form.entries()) {
    if ((key === 'file' || key.startsWith('file_')) && value instanceof File && value.size > 0) {
      uploadFiles.push(value);
    }
  }
  if (!note && uploadFiles.length === 0) {
    return jsonError(req, 'Agrega una descripción o al menos un archivo', 400);
  }

  let fileRecords: Awaited<ReturnType<typeof uploadMilestoneEvidenceFiles>> = [];
  if (uploadFiles.length > 0) {
    try {
      fileRecords = await uploadMilestoneEvidenceFiles(
        auth.supabase,
        taskId,
        auth.userId,
        uploadFiles,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al subir archivos';
      return jsonError(req, msg, 400);
    }
  }

  const { data: existing } = await auth.supabase
    .from('arcusx_milestone_evidence')
    .select('files, note')
    .eq('task_id', taskId)
    .eq('milestone_index', milestoneIndex)
    .maybeSingle();

  const prevFiles = Array.isArray(existing?.files) ? existing.files : [];
  const mergedFiles = [...prevFiles, ...fileRecords];
  const mergedNote = note || (existing?.note as string | null) || null;
  const now = new Date().toISOString();

  const row = {
    task_id: taskId,
    milestone_index: milestoneIndex,
    user_id: auth.userId,
    note: mergedNote,
    files: mergedFiles,
    updated_at: now,
  };

  const { data, error } = await auth.supabase
    .from('arcusx_milestone_evidence')
    .upsert(row, { onConflict: 'task_id,milestone_index' })
    .select('id, task_id, milestone_index, note, files, created_at, updated_at')
    .single();

  if (error) return jsonError(req, error.message, 500);

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'task.evidence_submitted',
    actor_user_id: auth.userId,
    payload: { milestone_index: milestoneIndex, file_count: fileRecords.length },
  });

  const evidence = data
    ? { ...data, files: await signEvidenceFiles(auth.supabase, data.files) }
    : null;

  return jsonSuccess(req, {
    message: 'Evidencia guardada',
    evidence,
  });
}
