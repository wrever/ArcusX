import { twSendTransaction } from './trustless-work-api.ts';
import type { StellarNetworkId } from './stellar-network.ts';
import { hashFromSignedXdr } from './xdr-hash.ts';

/**
 * Resuelve tx hash desde body: signed_xdr (broadcast) o hash explícito.
 * Si hay signed_xdr, **debe** broadcast-earse — no inventar éxito con solo hash del XDR
 * (eso marcaba approve/release como OK sin que la tx llegara a Stellar).
 */
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
    const sent = await twSendTransaction(signed, network);
    const fromTw = String(sent.hash ?? sent.txHash ?? '').trim();
    if (fromTw) return fromTw;
    // Último recurso solo si el provider no devolvió hash pero el envío no tiró:
    const local = hashFromSignedXdr(signed, network);
    if (local) return local;
    throw new Error('Broadcast ok pero sin tx hash — reintenta confirm');
  }
  return null;
}

/** Envía N XDR firmados en orden. Falla si algún broadcast falla (no fake-success). */
export async function submitSignedXdrSequence(
  signedXdrs: string[],
  network: StellarNetworkId = 'testnet',
): Promise<{ hashes: string[]; lastHash: string | null }> {
  const hashes: string[] = [];
  for (const xdr of signedXdrs) {
    const trimmed = xdr.trim();
    if (!trimmed) continue;
    const sent = await twSendTransaction(trimmed, network);
    let h = String(sent.hash ?? sent.txHash ?? '').trim();
    if (!h) h = hashFromSignedXdr(trimmed, network) ?? '';
    if (!h) {
      throw new Error('Broadcast sin tx hash — reintenta confirm');
    }
    hashes.push(h);
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
