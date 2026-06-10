import type { SupabaseClient } from '@supabase/supabase-js';
import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import type { ApiContext } from './types.ts';
import { requireUser } from './require.ts';
import { uploadDealEvidenceFiles } from './storage-helpers.ts';

async function assertDealParticipant(
  supabase: SupabaseClient,
  agreementId: string,
  userId: number,
) {
  const { data: deal } = await supabase
    .from('arcusx_agreements')
    .select('id, initiator_user_id, counterparty_user_id, status, title')
    .eq('id', agreementId)
    .maybeSingle();

  if (!deal) return { error: 'Deal no encontrado', deal: null as null };
  const initiator = Number(deal.initiator_user_id);
  const counterparty = deal.counterparty_user_id != null ? Number(deal.counterparty_user_id) : null;
  if (userId !== initiator && userId !== counterparty) {
    return { error: 'No autorizado', deal: null as null };
  }
  if (['cancelled', 'completed'].includes(String(deal.status))) {
    return { error: 'Este deal ya no acepta evidencia', deal: null as null };
  }
  return { error: null, deal };
}

async function signDealEvidenceFiles(supabase: SupabaseClient, files: unknown): Promise<unknown[]> {
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

export async function getDealEvidence(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const agreementId = String(url.searchParams.get('agreement_id') ?? '').trim();
  if (!agreementId) return jsonError(req, 'agreement_id requerido', 400);

  const check = await assertDealParticipant(auth.supabase, agreementId, auth.userId);
  if (check.error || !check.deal) return jsonError(req, check.error ?? 'No autorizado', 403);

  const { data, error } = await auth.supabase
    .from('arcusx_deal_evidence')
    .select('id, agreement_id, user_id, note, files, created_at')
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: true });

  if (error) return jsonError(req, error.message, 500);

  const items = await Promise.all(
    (data ?? []).map(async (row) => ({
      ...row,
      files: await signDealEvidenceFiles(auth.supabase, row.files),
    })),
  );

  return jsonSuccess(req, { evidence: items });
}

export async function uploadDealEvidence(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const form = await req.formData();
  const agreementId = String(form.get('agreement_id') ?? '').trim();
  const note = String(form.get('note') ?? '').trim();

  if (!agreementId) return jsonError(req, 'agreement_id requerido', 400);

  const check = await assertDealParticipant(auth.supabase, agreementId, auth.userId);
  if (check.error || !check.deal) return jsonError(req, check.error ?? 'No autorizado', 403);

  const uploadFiles: File[] = [];
  for (const [key, value] of form.entries()) {
    if ((key === 'file' || key.startsWith('file_')) && value instanceof File && value.size > 0) {
      uploadFiles.push(value);
    }
  }
  if (!note && uploadFiles.length === 0) {
    return jsonError(req, 'Agrega una descripción o al menos un archivo', 400);
  }

  let fileRecords: Awaited<ReturnType<typeof uploadDealEvidenceFiles>> = [];
  if (uploadFiles.length > 0) {
    try {
      fileRecords = await uploadDealEvidenceFiles(
        auth.supabase,
        agreementId,
        auth.userId,
        uploadFiles,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al subir archivos';
      return jsonError(req, msg, 400);
    }
  }

  const { data, error } = await auth.supabase
    .from('arcusx_deal_evidence')
    .insert({
      agreement_id: agreementId,
      user_id: auth.userId,
      note: note || null,
      files: fileRecords,
    })
    .select('id, agreement_id, user_id, note, files, created_at')
    .single();

  if (error) return jsonError(req, error.message, 500);

  await logDomainEvent(auth.supabase, {
    entity_type: 'agreement',
    entity_id: agreementId,
    event_type: 'deal.evidence_submitted',
    actor_user_id: auth.userId,
    payload: { file_count: fileRecords.length },
  });

  const signed = {
    ...data,
    files: await signDealEvidenceFiles(auth.supabase, data?.files),
  };

  return jsonSuccess(req, { evidence: signed });
}
