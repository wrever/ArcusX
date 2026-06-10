/** Freighter / stellar-wallets-kit guardado en localStorage */
export function isStellarWalletConnected(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem('stellar_wallet');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { address?: string };
    return typeof parsed.address === 'string' && parsed.address.startsWith('G');
  } catch {
    return false;
  }
}
