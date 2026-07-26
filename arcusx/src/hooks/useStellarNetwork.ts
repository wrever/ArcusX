import { useCallback, useEffect, useState } from 'react';
import {
  getActiveStellarNetwork,
  isMainnetEnabled,
  setActiveStellarNetwork,
  type StellarNetworkId,
} from '../config/stellarDual';

export function useStellarNetwork() {
  const [network, setNetwork] = useState<StellarNetworkId>(() => getActiveStellarNetwork());

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ network: StellarNetworkId }>).detail;
      if (detail?.network) setNetwork(detail.network);
      else setNetwork(getActiveStellarNetwork());
    };
    window.addEventListener('arcusx:network-changed', onChange);
    return () => window.removeEventListener('arcusx:network-changed', onChange);
  }, []);

  const switchNetwork = useCallback((next: StellarNetworkId) => {
    setActiveStellarNetwork(next);
    setNetwork(next);
  }, []);

  return {
    network,
    isMainnet: network === 'mainnet',
    mainnetEnabled: isMainnetEnabled(),
    switchNetwork,
  };
}
