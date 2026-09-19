import { useCallback, useEffect, useRef, useState } from 'react';
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

  /** SDK TW devuelve función nueva cada render — ref evita loop infinito en useEffect. */
  const getEscrowRef = useRef(getEscrowByContractIds);
  getEscrowRef.current = getEscrowByContractIds;

  const contractId = deal?.escrow_contract_id?.trim() ?? '';
  const fetchGen = useRef(0);

  const refresh = useCallback(async () => {
    if (!contractId || !getEscrowRef.current) {
      setEscrow(null);
      return;
    }
    const gen = ++fetchGen.current;
    setLoading(true);
    try {
      const row = await fetchDealEscrowFromIndexer(contractId, (params) =>
        getEscrowRef.current!(params),
      );
      if (gen !== fetchGen.current) return;
      setEscrow(row);
    } finally {
      if (gen === fetchGen.current) setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const contractOnChain = isDealContractOnChain(escrow) || Boolean(contractId);
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
