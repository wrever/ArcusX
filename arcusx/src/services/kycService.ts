import { arcusxApiHeaders, arcusxApiUrl } from '../config/arcusxApi';

export type KycStatus =
  | 'not_required'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type VerificationKind = 'kyc' | 'kyb';

export interface EnterpriseProfile {
  legal_name?: string;
  trade_name?: string;
  tax_id?: string;
  country?: string;
  representative_name?: string;
  representative_role?: string;
}

export interface IndividualProfile {
  full_name?: string;
  document_id?: string;
  country?: string;
}

export interface VerificationStatusResponse {
  success: boolean;
  account_type?: string;
  kyc_status?: KycStatus;
  kyc_submitted_at?: string | null;
  kyc_reviewed_at?: string | null;
  kyc_rejection_reason?: string | null;
  enterprise_profile?: EnterpriseProfile | null;
  individual_profile?: IndividualProfile | null;
  latest_request?: {
    id: number;
    request_type?: string;
    status: string;
    rejection_reason?: string;
  } | null;
  verification_kind?: VerificationKind;
  is_verified?: boolean;
  can_publish_as_enterprise?: boolean;
  can_show_verified_badge?: boolean;
  message?: string;
}

export async function getVerificationStatus(): Promise<VerificationStatusResponse> {
  const res = await fetch(arcusxApiUrl('get_verification_status'), {
    headers: arcusxApiHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'No se pudo cargar el estado de verificación');
  }
  return data;
}

async function submitKycForm(
  action: 'submit_enterprise_kyc' | 'submit_individual_kyc',
  form: FormData,
): Promise<VerificationStatusResponse> {
  const headers = arcusxApiHeaders();
  headers.delete('Content-Type');

  const res = await fetch(arcusxApiUrl(action), {
    method: 'POST',
    headers,
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Error al enviar solicitud');
  }
  return data;
}

export async function submitEnterpriseKyc(form: {
  legal_name: string;
  trade_name?: string;
  tax_id: string;
  country?: string;
  representative_name?: string;
  representative_role?: string;
  website?: string;
  contact_phone?: string;
  documents?: File[];
}): Promise<VerificationStatusResponse> {
  const body = new FormData();
  body.append('legal_name', form.legal_name.trim());
  if (form.trade_name?.trim()) body.append('trade_name', form.trade_name.trim());
  body.append('tax_id', form.tax_id.trim());
  body.append('country', form.country?.trim() || 'CL');
  if (form.representative_name?.trim()) body.append('representative_name', form.representative_name.trim());
  if (form.representative_role?.trim()) body.append('representative_role', form.representative_role.trim());
  if (form.website?.trim()) body.append('website', form.website.trim());
  if (form.contact_phone?.trim()) body.append('contact_phone', form.contact_phone.trim());
  (form.documents ?? []).slice(0, 5).forEach((file, i) => body.append(`document_${i}`, file));
  return submitKycForm('submit_enterprise_kyc', body);
}

export async function submitIndividualKyc(form: {
  full_name: string;
  document_id: string;
  country?: string;
  document_front: File;
  document_back: File;
}): Promise<VerificationStatusResponse> {
  const body = new FormData();
  body.append('full_name', form.full_name.trim());
  body.append('document_id', form.document_id.trim());
  body.append('country', form.country?.trim() || 'CL');
  body.append('document_front', form.document_front);
  body.append('document_back', form.document_back);
  return submitKycForm('submit_individual_kyc', body);
}
