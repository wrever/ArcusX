import { twSendTransaction } from './trustless-work-api.ts';
import type { StellarNetworkId } from './stellar-network.ts';
import { hashFromSignedXdr } from './xdr-hash.ts';

/** Resuelve tx hash desde body: signed_xdr (TW send) o hash explícito. */
export async function resolveEscrowTxHash(
  body: Record<string, unknown>,
  network: StellarNetworkId = 'testnet',
): Promise<string | null> {
  const direct = String(
    body.fund_tx_hash ?? body.release_tx_hash ?? body.deploy_tx_hash ??
    body.transaction_hash ?? body.tx_hash ?? '',
  ).trim();
  if (direct) return direct;

  const signed = body.signed_xdr ? String(body.signed_xdr).trim() : '';
  if (signed) {
    try {
      const sent = await twSendTransaction(signed, network);
      const fromTw = String(sent.hash ?? sent.txHash ?? '').trim();
      if (fromTw) return fromTw;
    } catch (e) {
      console.warn('[resolveEscrowTxHash] TW send failed, falling back to XDR hash', e);
    }
    return hashFromSignedXdr(signed, network);
  }
  return null;
}

/** Envía N XDR firmados en orden (release = approve + release). Devuelve hash del último. */
export async function submitSignedXdrSequence(
  signedXdrs: string[],
  network: StellarNetworkId = 'testnet',
): Promise<{ hashes: string[]; lastHash: string | null }> {
  const hashes: string[] = [];
  for (const xdr of signedXdrs) {
    const trimmed = xdr.trim();
    if (!trimmed) continue;
    let h = '';
    try {
      const sent = await twSendTransaction(trimmed, network);
      h = String(sent.hash ?? sent.txHash ?? '').trim();
    } catch (e) {
      console.warn('[submitSignedXdrSequence] TW send failed', e);
    }
    if (!h) h = hashFromSignedXdr(trimmed, network) ?? '';
    if (h) hashes.push(h);
  }
  return { hashes, lastHash: hashes.length ? hashes[hashes.length - 1] : null };
}

export function collectSignedXdrs(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.signed_xdrs)) {
    return body.signed_xdrs.map((x) => String(x).trim()).filter(Boolean);
  }
  if (Array.isArray(body.signed_xdr)) {
    return body.signed_xdr.map((x) => String(x).trim()).filter(Boolean);
  }
  const single = body.signed_xdr ? String(body.signed_xdr).trim() : '';
  return single ? [single] : [];
}
