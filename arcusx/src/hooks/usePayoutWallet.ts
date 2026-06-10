import { useCallback, useState } from 'react';
import { authService } from '../services/authService';
import { isValidStellarGAddress } from '../utils/stellarAddress';

export type PayoutWalletStatus = {
  registered: boolean;
  address: string | null;
};

export async function fetchPayoutWalletStatus(): Promise<PayoutWalletStatus> {
  const w = await authService.verifyWallet();
  const payout = w.private_payout_wallet ?? w.wallet_address;
  const registered = Boolean(
    w.success && w.has_wallet && isValidStellarGAddress(payout),
  );
  return {
    registered,
    address: registered ? String(payout).trim() : null,
  };
}

export function usePayoutWallet() {
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<PayoutWalletStatus> => {
    setLoading(true);
    try {
      const status = await fetchPayoutWalletStatus();
      setRegistered(status.registered);
      setAddress(status.address);
      return status;
    } catch {
      setRegistered(false);
      setAddress(null);
      return { registered: false, address: null };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, registered, address, refresh };
}
