import type { AgreementDeal } from '../services/dealsService';
import { funderWallet } from '../services/dealEscrow';
import { normalizePlatformFeeRate, STANDARD_PLATFORM_FEE_RATE } from '../config/platformFee';

export function dealDepositAmount(deal: AgreementDeal): number {
  const total = Number(deal.client_total);
  if (Number.isFinite(total) && total > 0) return total;
  const net = Number(deal.amount_usdc);
  const rate = dealPlatformFeeRate(deal);
  return net / (1 - rate);
}

export function dealPlatformFeeRate(deal: AgreementDeal): number {
  if (deal.platform_fee_rate != null) {
    return normalizePlatformFeeRate(deal.platform_fee_rate);
  }
  const net = Number(deal.amount_usdc);
  const total = Number(deal.client_total);
  if (net > 0 && total > net) {
    return normalizePlatformFeeRate((total - net) / total);
  }
  return STANDARD_PLATFORM_FEE_RATE;
}

export function dealPlatformFeePercent(deal: AgreementDeal): number {
  return dealPlatformFeeRate(deal) * 100;
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
  const releaser = walletAddress && walletAddress === deal.release_signer_wallet;

  if (isCreator) {
    actions.push('copy_link');
    if (deal.status === 'sent') actions.push('open_link');
  }

  if (!isCreator && userId != null) {
    if (deal.status === 'sent' && !isCounterparty) actions.push('accept');
    if (deal.status === 'sent' || deal.status === 'accepted') actions.push('open_link');
  }

  if (
    payer &&
    deal.status === 'accepted' &&
    !deal.escrow_contract_id
  ) {
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
