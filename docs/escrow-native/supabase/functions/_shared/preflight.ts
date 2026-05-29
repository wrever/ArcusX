/**
 * Comprobaciones previas a operaciones escrow (trustlines, red).
 */

import { getStellarConfig } from './stellar-network.ts';
import { getUsdcTrustlineForNetwork } from './trustline.ts';

export interface TrustlineCheckResult {
  address: string;
  hasTrustline: boolean;
  exists: boolean;
}

export async function checkUsdcTrustline(
  accountId: string,
): Promise<TrustlineCheckResult> {
  const { horizonUrl, network, usdcIssuer } = getStellarConfig();
  const trustline = getUsdcTrustlineForNetwork(network);

  if (!accountId.startsWith('G')) {
    return { address: accountId, hasTrustline: false, exists: false };
  }

  const res = await fetch(`${horizonUrl}/accounts/${accountId}`);
  if (res.status === 404) {
    return { address: accountId, hasTrustline: false, exists: false };
  }
  if (!res.ok) {
    throw new Error(`Horizon error ${res.status} al leer ${accountId}`);
  }

  const data = await res.json() as {
    balances?: Array<{
      asset_type?: string;
      asset_code?: string;
      asset_issuer?: string;
    }>;
  };

  const hasTrustline = (data.balances ?? []).some(
    (b) =>
      (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') &&
      b.asset_code === trustline.symbol &&
      b.asset_issuer === usdcIssuer,
  );

  return { address: accountId, hasTrustline, exists: true };
}

/** Falla si cliente o freelancer no pueden recibir USDC en esta red. */
export async function assertParticipantsTrustlines(
  clientWallet: string,
  freelancerWallet: string,
): Promise<void> {
  const [client, freelancer] = await Promise.all([
    checkUsdcTrustline(clientWallet),
    checkUsdcTrustline(freelancerWallet),
  ]);

  if (!client.exists) {
    throw new Error(`Cuenta cliente no existe en ${getStellarConfig().network}`);
  }
  if (!client.hasTrustline) {
    throw new Error(
      `Cliente sin trustline USDC (${getUsdcTrustlineForNetwork(getStellarConfig().network).address})`,
    );
  }
  if (!freelancer.exists) {
    throw new Error(`Cuenta freelancer no existe en ${getStellarConfig().network}`);
  }
  if (!freelancer.hasTrustline) {
    throw new Error(
      `Freelancer sin trustline USDC (${getUsdcTrustlineForNetwork(getStellarConfig().network).address})`,
    );
  }
}
