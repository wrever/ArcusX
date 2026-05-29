import {
  isSorobanContractId,
  prepareResolveDispute,
} from '../_shared/soroban-escrow.ts';
import { getStellarConfig } from '../_shared/stellar-network.ts';
import { getRepository } from '../_shared/repository.ts';
import { requireAuth, requireAdminWallet } from '../_shared/auth.ts';
import { assertEscrowStatus } from '../_shared/guards.ts';
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';

interface DisputeDistribution {
  client_amount: string;
  freelancer_amount: string;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    await requireAuth(req);

    const body = await req.json();
    const {
      dispute_id: disputeId,
      escrow_public_key: escrowPublicKey,
      client_wallet: clientWallet,
      freelancer_wallet: freelancerWallet,
      admin_wallet: adminWallet,
      distribution,
    } = body ?? {};

    if (
      !disputeId || !escrowPublicKey || !clientWallet || !freelancerWallet ||
      !adminWallet || !distribution
    ) {
      return errorResponse(
        'dispute_id, escrow_public_key, wallets, admin_wallet, distribution requeridos',
      );
    }

    requireAdminWallet(adminWallet);

    const dist = distribution as DisputeDistribution;
    const clientAmount = dist.client_amount ?? '0';
    const freelancerAmount = dist.freelancer_amount ?? '0';

    const repo = getRepository();
    const escrow = await repo.getEscrowByPublicKey(escrowPublicKey).catch(
      () => null,
    );

    if (escrow) {
      assertEscrowStatus(escrow.escrow_status, 'disputed');
      if (escrow.id !== disputeId && String(escrow.task_id) !== String(disputeId)) {
        return errorResponse('dispute_id no coincide con escrow', 409);
      }
    }

    if (!isSorobanContractId(escrowPublicKey)) {
      return errorResponse('Solo escrows Soroban (C…) soportados', 400);
    }

    const clientAmt = parseFloat(clientAmount);
    const freelancerAmt = parseFloat(freelancerAmount);
    if (!Number.isFinite(clientAmt) || !Number.isFinite(freelancerAmt)) {
      return errorResponse('Montos de distribución inválidos');
    }
    if (clientAmt < 0 || freelancerAmt < 0) {
      return errorResponse('Montos de distribución no pueden ser negativos');
    }

    const { network } = getStellarConfig();

    const { unsignedResolveXdr } = await prepareResolveDispute({
      contractId: escrowPublicKey,
      disputeResolver: adminWallet,
      distributions: [
        { address: clientWallet, amount: clientAmt },
        { address: freelancerWallet, amount: freelancerAmt },
      ],
    });

    return jsonResponse({
      network,
      success: true,
      dispute_id: disputeId,
      escrow_type: 'soroban',
      requires_admin_signature: true,
      contract_id: escrowPublicKey,
      unsigned_resolve_xdr: unsignedResolveXdr,
      escrow_status: escrow?.escrow_status ?? 'disputed',
      message:
        'Admin firma unsigned_resolve_xdr → POST escrow-resolve-dispute-confirm.',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error';
    const status = message.includes('no configurado') ? 503 : 403;
    return errorResponse(message, status);
  }
});
