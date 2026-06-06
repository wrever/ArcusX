import { useCallback, useEffect, useState } from 'react';
import type { AgreementDeal } from '../services/dealsService';
import type { DealEscrowHooks } from '../services/dealEscrow';
import {
  fetchDealEscrowFromIndexer,
  isDealContractOnChain,
  isDealEscrowFunded,
  isDealEscrowReleased,
  isDealMilestoneApproved,
  type DealEscrowIndexerRow,
} from '../utils/dealEscrowVerification';

export type DealEscrowChainState = {
  loading: boolean;
  escrow: DealEscrowIndexerRow | null;
  contractOnChain: boolean;
  funded: boolean;
  milestoneApproved: boolean;
  released: boolean;
  refresh: () => Promise<void>;
};

export function useDealEscrowChainState(
  deal: AgreementDeal | null,
  getEscrowByContractIds: DealEscrowHooks['getEscrowByContractIds'] | undefined,
): DealEscrowChainState {
  const [loading, setLoading] = useState(false);
  const [escrow, setEscrow] = useState<DealEscrowIndexerRow | null>(null);

  const refresh = useCallback(async () => {
    const contractId = deal?.escrow_contract_id?.trim();
    if (!contractId || !getEscrowByContractIds) {
      setEscrow(null);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchDealEscrowFromIndexer(contractId, getEscrowByContractIds);
      setEscrow(row);
    } finally {
      setLoading(false);
    }
  }, [deal?.escrow_contract_id, getEscrowByContractIds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const contractOnChain = isDealContractOnChain(escrow) || Boolean(deal?.escrow_contract_id);
  const funded =
    isDealEscrowFunded(escrow) || ['funded', 'active'].includes(String(deal?.status ?? ''));
  const milestoneApproved = isDealMilestoneApproved(escrow);
  const released =
    isDealEscrowReleased(escrow) || deal?.status === 'completed';

  return {
    loading,
    escrow,
    contractOnChain,
    funded,
    milestoneApproved,
    released,
    refresh,
  };
}
