import { getStellarConfig } from '../_shared/stellar-network.ts';
import {
  isSorobanContractId,
  prepareCompleteMilestone,
} from '../_shared/soroban-escrow.ts';
import { getRepository } from '../_shared/repository.ts';
import { requireAuth, requireWalletParticipant } from '../_shared/auth.ts';
import { assertStellarAddress } from '../_shared/validation.ts';
import { assertEscrowStatus } from '../_shared/guards.ts';
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    await requireAuth(req);

    const body = await req.json();
    const {
      task_id: taskId,
      evidence_url: evidenceUrl,
      signer_wallet: signerWallet,
    } = body ?? {};

    if (!taskId || !signerWallet) {
      return errorResponse('task_id y signer_wallet requeridos');
    }

    assertStellarAddress(signerWallet, 'signer_wallet');

    const repo = getRepository();
    const escrow = await repo.getEscrowByTaskId(Number(taskId)).catch(() => null);

    if (escrow) {
      requireWalletParticipant(
        signerWallet,
        escrow.client_wallet,
        escrow.freelancer_wallet,
      );
      if (signerWallet !== escrow.freelancer_wallet) {
        return errorResponse('Solo el freelancer puede marcar milestone complete', 403);
      }
      assertEscrowStatus(escrow.escrow_status, 'active');
      await repo.setMilestoneStatus(
        Number(taskId),
        'completed',
        evidenceUrl ?? null,
      );
    }

    const { network } = getStellarConfig();
    const escrowPk = escrow?.escrow_public_key;

    if (escrowPk && isSorobanContractId(escrowPk)) {
      const { unsignedCompleteXdr } = await prepareCompleteMilestone({
        contractId: escrowPk,
        serviceProvider: signerWallet,
        newEvidence: typeof evidenceUrl === 'string' ? evidenceUrl : undefined,
      });

      return jsonResponse({
        network,
        success: true,
        task_id: taskId,
        escrow_type: 'soroban',
        requires_client_signature: true,
        contract_id: escrowPk,
        unsigned_complete_xdr: unsignedCompleteXdr,
        milestone_status: 'completed',
        evidence_url: evidenceUrl ?? null,
        message:
          'Firma unsigned_complete_xdr (freelancer) y envía vía TW send-transaction.',
      });
    }

    return jsonResponse({
      network,
      success: true,
      task_id: taskId,
      milestone_status: 'completed',
      evidence_url: evidenceUrl ?? null,
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Error');
  }
});
