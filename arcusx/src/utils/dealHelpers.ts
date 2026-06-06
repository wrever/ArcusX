import type { AgreementDeal } from '../services/dealsService';
import { funderWallet, releaseSignerWallet } from '../services/dealEscrow';
import { normalizePlatformFeeRate, STANDARD_PLATFORM_FEE_RATE } from '../config/platformFee';
import { quoteEscrowFundAmount } from './escrowFeeQuote';

export function dealDepositAmount(deal: AgreementDeal): number {
  const total = Number(deal.client_total);
  if (Number.isFinite(total) && total > 0) return total;
  const net = Number(deal.amount_usdc);
  const rate = dealPlatformFeeRate(deal);
  if (!Number.isFinite(net) || net <= 0) return 0;
  return quoteEscrowFundAmount(net, rate);
}

export function dealPlatformFeeRate(deal: AgreementDeal): number {
  if (deal.platform_fee_rate != null) {
    return normalizePlatformFeeRate(deal.platform_fee_rate);
  }
  return STANDARD_PLATFORM_FEE_RATE;
}

export function dealPlatformFeePercent(deal: AgreementDeal): number {
  return dealPlatformFeeRate(deal) * 100;
}

/** Usuario a calificar cuando el release signer completa el deal. */
export function dealRatedUserId(deal: AgreementDeal, raterUserId: number): number | null {
  if (deal.initiator_user_id === raterUserId) {
    return deal.counterparty_user_id ?? null;
  }
  if (deal.counterparty_user_id === raterUserId) {
    return deal.initiator_user_id ?? null;
  }
  return null;
}

export function partitionDeals(deals: AgreementDeal[], userId: number) {
  const created: AgreementDeal[] = [];
  const received: AgreementDeal[] = [];
  for (const d of deals) {
    if (d.initiator_user_id === userId) created.push(d);
    else if (d.counterparty_user_id === userId) received.push(d);
  }
  return { created, received };
}

export type DealActionKind =
  | 'copy_link'
  | 'open_link'
  | 'accept'
  | 'prepare_escrow'
  | 'fund'
  | 'release'
  | 'workspace';

export function getDealActions(
  deal: AgreementDeal,
  userId: number | null,
  walletAddress: string | null,
): DealActionKind[] {
  const actions: DealActionKind[] = ['workspace'];
  const isCreator = userId != null && deal.initiator_user_id === userId;
  const isCounterparty = userId != null && deal.counterparty_user_id === userId;
  const payer = walletAddress && walletAddress === funderWallet(deal);
  const releaser = walletAddress && walletAddress === releaseSignerWallet(deal);

  if (isCreator) {
    actions.push('copy_link');
    if (deal.status === 'sent') actions.push('open_link');
  }

  if (!isCreator && userId != null) {
    if (deal.status === 'sent' && !isCounterparty) actions.push('accept');
    if (deal.status === 'sent' || deal.status === 'accepted') actions.push('open_link');
  }

  if (payer && deal.status === 'accepted' && deal.escrow_contract_id) {
    actions.push('fund');
  }

  if (payer && deal.status === 'accepted' && !deal.escrow_contract_id) {
    actions.push('fund');
  }

  if (
    releaser &&
    deal.escrow_contract_id &&
    ['funded', 'active'].includes(deal.status)
  ) {
    actions.push('release');
  }

  return [...new Set(actions)];
}
