import { getStellarConfig } from '../_shared/stellar-network.ts';
import { getRepository } from '../_shared/repository.ts';
import { requireAuth, requireAdminWallet } from '../_shared/auth.ts';
import { assertEscrowStatus } from '../_shared/guards.ts';
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { twSendTransaction } from '../_shared/soroban-escrow.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    await requireAuth(req);

    const body = await req.json();
    const {
      dispute_id: disputeId,
      contract_id: contractId,
      admin_wallet: adminWallet,
      signed_resolve_xdr: signedResolveXdr,
    } = body ?? {};

    if (!disputeId || !contractId || !adminWallet || !signedResolveXdr) {
      return errorResponse(
        'dispute_id, contract_id, admin_wallet, signed_resolve_xdr requeridos',
      );
    }

    if (!contractId.startsWith('C')) {
      return errorResponse('contract_id debe ser Soroban C…', 400);
    }

    requireAdminWallet(adminWallet);

    const repo = getRepository();
    const escrow = await repo.getEscrowByPublicKey(contractId).catch(() => null);

    if (escrow) {
      assertEscrowStatus(escrow.escrow_status, 'disputed');
    }

    const sent = await twSendTransaction(signedResolveXdr);
    const txHash = sent.hash;
    if (!txHash) {
      return errorResponse('Resolve sin hash en respuesta TW', 422);
    }

    if (escrow) {
      try {
        await repo.updateEscrowStatus(escrow.task_id, 'completed', {
          release_tx_hash: txHash,
        });
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : '';
        if (!msg.includes('no conectada')) throw dbErr;
      }
    }

    const { network, explorerTxUrl } = getStellarConfig();
    return jsonResponse({
      network,
      success: true,
      dispute_id: disputeId,
      contract_id: contractId,
      escrow_type: 'soroban',
      tx_hash: txHash,
      escrow_status: 'completed',
      explorer_tx_url: explorerTxUrl(txHash),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error';
    const status = message.includes('no configurado') ? 503 : 403;
    return errorResponse(message, status);
  }
});
