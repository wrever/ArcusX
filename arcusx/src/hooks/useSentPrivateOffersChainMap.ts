import { useEffect, useMemo, useRef, useState } from 'react';
import { useGetEscrowFromIndexerByContractIds } from '@trustless-work/escrow/hooks';
import {
  isTrustlessWorkContractId,
  normalizeContractId,
  type PrivateOfferTwRow,
} from '../utils/privateOfferChainState';

function contractKeyFromRow(row: PrivateOfferTwRow): string | null {
  const id = normalizeContractId(row.contractId ?? row.id);
  return id || null;
}

/**
 * Una sola consulta TW al cargar la pestaña Ofertas (batch por contractIds).
 */
export function useSentPrivateOffersChainMap(
  offers: Array<{ escrow_id?: string | null }>,
) {
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  const getEscrowRef = useRef(getEscrowByContractIds);
  getEscrowRef.current = getEscrowByContractIds;

  const [byContractId, setByContractId] = useState<Map<string, PrivateOfferTwRow>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const fetchGen = useRef(0);

  const contractIdsKey = useMemo(() => {
    const ids = new Set<string>();
    for (const offer of offers) {
      const id = normalizeContractId(offer.escrow_id);
      if (isTrustlessWorkContractId(id)) ids.add(id);
    }
    return [...ids].sort().join(',');
  }, [offers]);

  const refresh = useMemo(() => {
    const ids = contractIdsKey ? contractIdsKey.split(',') : [];
    return async () => {
      if (ids.length === 0) {
        setByContractId(new Map());
        setLoaded(true);
        return;
      }
      const gen = ++fetchGen.current;
      setLoaded(false);
      try {
        const result = await getEscrowRef.current({
          contractIds: ids,
          validateOnChain: true,
        });
        if (gen !== fetchGen.current) return;
        const rows = Array.isArray(result)
          ? result
          : (result as { escrows?: PrivateOfferTwRow[] })?.escrows ?? [];
        const map = new Map<string, PrivateOfferTwRow>();
        for (const row of rows) {
          const key = contractKeyFromRow(row as PrivateOfferTwRow);
          if (key) map.set(key, row as PrivateOfferTwRow);
        }
        setByContractId(map);
      } catch {
        if (gen !== fetchGen.current) return;
        setByContractId(new Map());
      } finally {
        if (gen === fetchGen.current) setLoaded(true);
      }
    };
  }, [contractIdsKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    byContractId,
    chainLoaded: loaded,
    hasTwContracts: contractIdsKey.length > 0,
    refreshChainMap: refresh,
    lookupTwRow: (escrowId?: string | null): PrivateOfferTwRow | null => {
      const key = normalizeContractId(escrowId);
      if (!key) return null;
      return byContractId.get(key) ?? null;
    },
  };
}
