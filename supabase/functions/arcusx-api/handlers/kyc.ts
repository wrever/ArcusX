import type { SupabaseClient } from '@supabase/supabase-js';
import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import { formatRutDisplay, validateRut } from '../../_shared/rut-chile.ts';
import type { ApiContext } from './types.ts';
import { requireUser } from './require.ts';

const MAX_DOC = 8 * 1024 * 1024;
const ALLOWED_DOC = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

async function collectUploadFiles(form: FormData): Promise<File[]> {
  const uploadFiles: File[] = [];
  for (const [key, value] of form.entries()) {
    if (
      (key === 'document' || key.startsWith('document_')) &&
      key !== 'document_front' &&
      key !== 'document_back' &&
      value instanceof File &&
      value.size > 0
    ) {
      uploadFiles.push(value);
    }
  }
  return uploadFiles;
}

type KycUploadItem = { file: File; documentType: string };

async function uploadKycDocuments(
  supabase: SupabaseClient,
  authUserId: number,
  kycRequestId: number | undefined,
  items: KycUploadItem[],
  req: Request,
): Promise<Response | null> {
  for (const { file, documentType } of items.slice(0, 5)) {
    if (file.size > MAX_DOC) {
      return jsonError(req, `Archivo ${file.name} supera 8MB`, 400);
    }
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_DOC.has(mime)) {
      return jsonError(req, `Tipo no permitido: ${file.name}`, 400);
    }
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const path = `${authUserId}/${kycRequestId}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const buf = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from('kyc-documents').upload(path, buf, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) return jsonError(req, upErr.message, 500);

    await supabase.from('arcusx_kyc_documents').insert({
      kyc_request_id: kycRequestId,
      document_type: documentType,
      storage_path: path,
      original_filename: file.name,
      mime_type: mime,
      file_size: file.size,
    });
  }
  return null;
}

function kycBlockedStatus(status: string | undefined): boolean {
  return status === 'approved' || status === 'under_review' || status === 'pending';
}

export async function getVerificationStatus(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const { data: user } = await auth.supabase
    .from('arcusx_users')
    .select('id, account_type, kyc_status, kyc_submitted_at, kyc_reviewed_at, kyc_rejection_reason')
    .eq('id', auth.userId)
    .single();

  const accountType = user?.account_type ?? 'individual';

  const [{ data: enterpriseProfile }, { data: individualProfile }, { data: lastRequest }] = await Promise.all([
    auth.supabase
      .from('arcusx_enterprise_profiles')
      .select('legal_name, trade_name, tax_id, country, representative_name, representative_role')
      .eq('user_id', auth.userId)
      .maybeSingle(),
    auth.supabase
      .from('arcusx_individual_kyc_profiles')
      .select('full_name, document_id, country')
      .eq('user_id', auth.userId)
      .maybeSingle(),
    auth.supabase
      .from('arcusx_kyc_requests')
      .select('id, request_type, status, rejection_reason, created_at, reviewed_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const approved = user?.kyc_status === 'approved';

  return jsonSuccess(req, {
    account_type: accountType,
    kyc_status: user?.kyc_status ?? 'not_required',
    kyc_submitted_at: user?.kyc_submitted_at,
    kyc_reviewed_at: user?.kyc_reviewed_at,
    kyc_rejection_reason: user?.kyc_rejection_reason,
    enterprise_profile: enterpriseProfile ?? null,
    individual_profile: individualProfile ?? null,
    latest_request: lastRequest ?? null,
    verification_kind: accountType === 'enterprise' ? 'kyb' : 'kyc',
    is_verified: approved,
    can_publish_as_enterprise: approved && accountType === 'enterprise' && Boolean(enterpriseProfile?.legal_name),
    can_show_verified_badge: approved && (
      (accountType === 'enterprise' && Boolean(enterpriseProfile?.legal_name)) ||
      (accountType === 'individual' && Boolean(individualProfile?.full_name))
    ),
  });
}

export async function submitIndividualKyc(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);
  const form = await req.formData();

  const fullName = String(form.get('full_name') ?? '').trim();
  const documentId = String(form.get('document_id') ?? '').trim();
  const country = String(form.get('country') ?? 'CL').trim();

  if (fullName.length < 2) {
    return jsonError(req, 'Nombre completo (full_name) requerido', 400);
  }
  if (documentId.length < 3) {
    return jsonError(req, 'Documento de identidad requerido', 400);
  }

  const normalizedDocId = country === 'CL' ? formatRutDisplay(documentId) : documentId;
  if (country === 'CL') {
    if (!validateRut(normalizedDocId)) {
      return jsonError(req, 'RUT inválido. Usa el formato 21873093-2 con dígito verificador correcto.', 400);
    }
  }

  const front = form.get('document_front');
  const back = form.get('document_back');
  if (!(front instanceof File) || front.size === 0) {
    return jsonError(req, 'Foto frontal del carnet de identidad requerida', 400);
  }
  if (!(back instanceof File) || back.size === 0) {
    return jsonError(req, 'Foto trasera del carnet de identidad requerida', 400);
  }

  const { data: user } = await auth.supabase
    .from('arcusx_users')
    .select('kyc_status, account_type')
    .eq('id', auth.userId)
    .single();

  if (user?.account_type === 'enterprise') {
    return jsonError(req, 'Usa el flujo KYB de empresa en el portal empresas', 400);
  }
  if (user?.kyc_status === 'approved') {
    return jsonError(req, 'Tu identidad ya está verificada', 400);
  }
  if (kycBlockedStatus(user?.kyc_status)) {
    return jsonError(req, 'Ya tienes una solicitud en revisión', 400);
  }

  const now = new Date().toISOString();

  await auth.supabase.from('arcusx_individual_kyc_profiles').upsert({
    user_id: auth.userId,
    full_name: fullName,
    document_id: normalizedDocId,
    country,
    updated_at: now,
  }, { onConflict: 'user_id' });

  const { data: kycReq, error: reqErr } = await auth.supabase
    .from('arcusx_kyc_requests')
    .insert({
      user_id: auth.userId,
      request_type: 'individual',
      status: 'under_review',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (reqErr) return jsonError(req, reqErr.message, 500);

  const extra = (await collectUploadFiles(form)).map((file) => ({ file, documentType: 'identity' }));
  const uploadErr = await uploadKycDocuments(auth.supabase, auth.userId, kycReq?.id, [
    { file: front, documentType: 'identity_front' },
    { file: back, documentType: 'identity_back' },
    ...extra,
  ], req);
  if (uploadErr) return uploadErr;

  await auth.supabase.from('arcusx_users').update({
    account_type: 'individual',
    kyc_status: 'under_review',
    kyc_submitted_at: now,
    kyc_rejection_reason: null,
    updated_at: now,
  }).eq('id', auth.userId);

  await logDomainEvent(auth.supabase, {
    entity_type: 'user',
    entity_id: auth.userId,
    event_type: 'kyc.submitted',
    actor_user_id: auth.userId,
    payload: { full_name: fullName, request_id: kycReq?.id, request_type: 'individual' },
  });

  return jsonSuccess(req, {
    message: 'Solicitud KYC enviada. Revisaremos en breve.',
    kyc_status: 'under_review',
    request_id: kycReq?.id,
  });
}

export async function submitEnterpriseKyc(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const form = await req.formData();
  const legalName = String(form.get('legal_name') ?? '').trim();
  const tradeName = String(form.get('trade_name') ?? '').trim();
  const taxId = String(form.get('tax_id') ?? '').trim();
  const country = String(form.get('country') ?? 'CL').trim();
  const repName = String(form.get('representative_name') ?? '').trim();
  const repRole = String(form.get('representative_role') ?? '').trim();
  const website = String(form.get('website') ?? '').trim();
  const phone = String(form.get('contact_phone') ?? '').trim();

  if (legalName.length < 2) {
    return jsonError(req, 'Razón social (legal_name) requerida', 400);
  }
  if (taxId.length < 3) {
    return jsonError(req, 'RUT/ID fiscal (tax_id) requerido', 400);
  }

  const { data: user } = await auth.supabase
    .from('arcusx_users')
    .select('kyc_status')
    .eq('id', auth.userId)
    .single();

  if (user?.kyc_status === 'approved') {
    return jsonError(req, 'Tu empresa ya está verificada', 400);
  }
  if (kycBlockedStatus(user?.kyc_status)) {
    return jsonError(req, 'Ya tienes una solicitud en revisión', 400);
  }

  const now = new Date().toISOString();

  await auth.supabase.from('arcusx_enterprise_profiles').upsert({
    user_id: auth.userId,
    legal_name: legalName,
    trade_name: tradeName || legalName,
    tax_id: taxId,
    country,
    representative_name: repName || null,
    representative_role: repRole || null,
    website: website || null,
    contact_phone: phone || null,
    updated_at: now,
  }, { onConflict: 'user_id' });

  const { data: kycReq, error: reqErr } = await auth.supabase
    .from('arcusx_kyc_requests')
    .insert({
      user_id: auth.userId,
      request_type: 'enterprise',
      status: 'under_review',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (reqErr) return jsonError(req, reqErr.message, 500);

  const uploadErr = await uploadKycDocuments(
    auth.supabase,
    auth.userId,
    kycReq?.id,
    (await collectUploadFiles(form)).map((file) => ({ file, documentType: 'registration' })),
    req,
  );
  if (uploadErr) return uploadErr;

  await auth.supabase.from('arcusx_users').update({
    account_type: 'enterprise',
    kyc_status: 'under_review',
    kyc_submitted_at: now,
    kyc_rejection_reason: null,
    updated_at: now,
  }).eq('id', auth.userId);

  await logDomainEvent(auth.supabase, {
    entity_type: 'user',
    entity_id: auth.userId,
    event_type: 'kyc.submitted',
    actor_user_id: auth.userId,
    payload: { legal_name: legalName, request_id: kycReq?.id, request_type: 'enterprise' },
  });

  return jsonSuccess(req, {
    message: 'Solicitud KYB enviada. Revisaremos en breve.',
    kyc_status: 'under_review',
    request_id: kycReq?.id,
  });
}

export type CreatorEnrichmentBox = {
  user: Record<string, unknown>;
  enterpriseProfile: Record<string, unknown> | null;
  individualProfile: Record<string, unknown> | null;
};

/** Perfiles KYC/KYB para listados de tareas */
export async function loadCreatorEnrichment(
  supabase: SupabaseClient,
  userIds: number[],
): Promise<Map<number, CreatorEnrichmentBox>> {
  const uniq = [...new Set(userIds.filter((id) => id > 0))];
  const out = new Map<number, CreatorEnrichmentBox>();
  if (uniq.length === 0) return out;

  const [{ data: users }, { data: enterpriseProfiles }, { data: individualProfiles }] = await Promise.all([
    supabase.from('arcusx_users').select('id, username, account_type, kyc_status').in('id', uniq),
    supabase.from('arcusx_enterprise_profiles').select('user_id, legal_name, trade_name').in('user_id', uniq),
    supabase.from('arcusx_individual_kyc_profiles').select('user_id, full_name').in('user_id', uniq),
  ]);

  const enterpriseByUser = new Map(
    (enterpriseProfiles ?? []).map((p) => [Number(p.user_id), p as Record<string, unknown>]),
  );
  const individualByUser = new Map(
    (individualProfiles ?? []).map((p) => [Number(p.user_id), p as Record<string, unknown>]),
  );

  for (const u of users ?? []) {
    const id = Number(u.id);
    out.set(id, {
      user: u as Record<string, unknown>,
      enterpriseProfile: enterpriseByUser.get(id) ?? null,
      individualProfile: individualByUser.get(id) ?? null,
    });
  }
  return out;
}
