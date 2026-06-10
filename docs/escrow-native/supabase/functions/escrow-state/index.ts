import { getStellarConfig } from '../_shared/stellar-network.ts';
import {
  isSorobanContractId,
  twGetEscrowByContractIds,
  verifyContractFunded,
} from '../_shared/soroban-escrow.ts';
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    let escrowPublicKey: string | undefined;
    let minBalance = 0;
    if (req.method === 'GET') {
      const url = new URL(req.url);
      escrowPublicKey = url.searchParams.get('escrow_public_key') ?? undefined;
      const min = url.searchParams.get('min_balance');
      if (min) minBalance = parseFloat(min);
    } else {
      const body = await req.json();
      escrowPublicKey = body?.escrow_public_key;
      if (body?.min_balance != null) {
        minBalance = parseFloat(String(body.min_balance));
      }
    }

    if (!escrowPublicKey) {
      return errorResponse('escrow_public_key requerido');
    }

    if (!isSorobanContractId(escrowPublicKey)) {
      return errorResponse(
        'Solo escrows Soroban (C…) soportados. Cuentas G… legacy retiradas.',
        400,
      );
    }

    const { network, explorerAccountUrl } = getStellarConfig();

    const verified = await verifyContractFunded(
      escrowPublicKey,
      minBalance > 0 ? minBalance : 0,
    );

    let indexerFlags: Record<string, unknown> = {};
    try {
      const list = await twGetEscrowByContractIds([escrowPublicKey], true);
      const row = list[0] as Record<string, unknown> | undefined;
      if (row) {
        indexerFlags = {
          status: row.status,
          flags: row.flags,
          disputed: (row.flags as { disputed?: boolean })?.disputed,
        };
      }
    } catch {
      /* indexer opcional */
    }

    return jsonResponse({
      network,
      escrow_type: 'soroban',
      escrow_public_key: escrowPublicKey,
      contract_id: escrowPublicKey,
      exists: true,
      balance: String(verified.balance),
      is_funded: verified.ok || verified.balance > 0,
      explorer_url: explorerAccountUrl(escrowPublicKey),
      indexer: indexerFlags,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno';
    return errorResponse(message);
  }
});
