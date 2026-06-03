import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';
import type { DealTemplateId } from '../constants/dealTemplates';

export interface AgreementDeal {
  id: string;
  deal_token: string;
  template_id: DealTemplateId | string;
  payment_mode: string;
  title: string;
  description: string;
  status: string;
  initiator_user_id?: number;
  counterparty_user_id?: number | null;
  initiator_wallet: string;
  counterparty_wallet?: string | null;
  release_signer_wallet: string;
  beneficiary_wallet: string;
  funder_role: 'initiator' | 'counterparty';
  amount_usdc: number;
  fee_usdc: number;
  client_total: number;
  platform_fee_rate?: number;
  escrow_contract_id?: string | null;
  expires_at?: string;
  created_at?: string;
  accepted_at?: string | null;
  funded_at?: string | null;
}

async function apiPost(action: string, body: Record<string, unknown>) {
  const res = await fetch(arcusxApiUrl(action), {
    method: 'POST',
    headers: arcusxApiHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Error ${action}`);
  }
  return data;
}

async function apiGet(action: string, query: Record<string, string>) {
  const res = await fetch(arcusxApiUrl(action, query), {
    headers: arcusxApiHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Error ${action}`);
  }
  return data;
}

export async function createDeal(payload: {
  template_id: DealTemplateId;
  title: string;
  description: string;
  amount_usdc: number;
  initiator_wallet: string;
  release_signer_wallet: string;
  beneficiary_wallet: string;
  funder_role: 'initiator' | 'counterparty';
  counterparty_wallet?: string;
}) {
  return apiPost('create_deal', payload);
}

export type DealViewerRole = 'initiator' | 'counterparty' | 'guest';

export async function getDealByToken(dealToken: string): Promise<{
  deal: AgreementDeal;
  viewer_role?: DealViewerRole;
  can_accept?: boolean;
}> {
  return apiGet('get_deal_by_token', { deal_token: dealToken });
}

export async function getMyDeals(): Promise<{ deals: AgreementDeal[] }> {
  return apiGet('get_my_deals', {});
}

export async function getDealDetails(agreementId: string): Promise<{ deal: AgreementDeal }> {
  return apiGet('get_deal_details', { agreement_id: agreementId });
}

export async function acceptDeal(dealToken: string, walletAddress: string) {
  return apiPost('accept_deal', { deal_token: dealToken, wallet_address: walletAddress });
}

export async function finalizeDealEscrow(payload: {
  agreement_id: string;
  escrow_id: string;
  transaction_hash?: string;
}) {
  return apiPost('finalize_deal_escrow', {
    agreement_id: payload.agreement_id,
    escrow_id: payload.escrow_id,
    transaction_hash: payload.transaction_hash,
  });
}

export async function markDealReleased(agreementId: string, transactionHash?: string) {
  return apiPost('mark_deal_released', {
    agreement_id: agreementId,
    transaction_hash: transactionHash,
  });
}

export function dealPublicUrl(dealToken: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/deal/${dealToken}`;
  }
  return `https://arcusx.pro/deal/${dealToken}`;
}
