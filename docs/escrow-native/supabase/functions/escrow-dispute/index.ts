import { getStellarConfig } from '../_shared/stellar-network.ts';
import {
  isSorobanContractId,
  prepareDisputeEscrow,
} from '../_shared/soroban-escrow.ts';
import { getRepository } from '../_shared/repository.ts';
import {
  requireAuth,
  requireTaskMembership,
  requireWalletParticipant,
  assertWalletMatchesMembership,
} from '../_shared/auth.ts';
import { assertStellarAddress } from '../_shared/validation.ts';
import { assertEscrowStatus, assertEscrowTransition } from '../_shared/guards.ts';
import { createSecurityAlert } from '../_shared/monitoring.ts';
import {
  handleSecureOptions,
  readJsonBody,
  secureErrorResponse,
  secureJsonResponse,
} from '../_shared/security.ts';

Deno.serve(async (req) => {
  const options = handleSecureOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return secureErrorResponse(req, 'Method not allowed', 405);

  try {
    const auth = await requireAuth(req);
    const body = await readJsonBody<Record<string, unknown>>(req);

    const taskId = Number(body.task_id);
    const reason = body.reason as string;
    const signerWallet = body.signer_wallet as string;

    if (!taskId || !reason || !signerWallet) {
      return secureErrorResponse(req, 'task_id, reason y signer_wallet requeridos');
    }

    assertStellarAddress(signerWallet, 'signer_wallet');

    const repo = getRepository();
    const escrow = await repo.getEscrowByTaskId(taskId).catch(() => null);

    let disputeId: string | null = null;

    if (escrow) {
      if (auth) {
        const member = await requireTaskMembership(auth.userId, taskId);
        requireWalletParticipant(
          signerWallet,
          escrow.client_wallet,
          escrow.freelancer_wallet,
        );
        assertWalletMatchesMembership(signerWallet, member.wallet);
      }

      assertEscrowStatus(escrow.escrow_status, 'active');
      assertEscrowTransition(escrow.escrow_status, 'disputed');

      disputeId = await repo.openDisputeRecord({
        taskId,
        reason,
        openedByUserId: auth?.userId,
        openedByWallet: signerWallet,
      });

      await createSecurityAlert({
        severity: 'medium',
        alertType: 'dispute_opened',
        message: `Disputa abierta en task ${taskId}`,
        taskId,
        escrowPublicKey: escrow.escrow_public_key,
        details: { reason },
      });
    }

    const { network } = getStellarConfig();

    const escrowPk = escrow?.escrow_public_key;
    if (escrowPk && isSorobanContractId(escrowPk)) {
      const { unsignedDisputeXdr } = await prepareDisputeEscrow({
        contractId: escrowPk,
        signer: signerWallet,
      });

      return secureJsonResponse(req, {
        network,
        success: true,
        task_id: taskId,
        escrow_type: 'soroban',
        requires_client_signature: true,
        contract_id: escrowPk,
        unsigned_dispute_xdr: unsignedDisputeXdr,
        escrow_status: 'disputed',
        signer_wallet: signerWallet,
        dispute_id: disputeId,
        reason,
        message:
          'Firma unsigned_dispute_xdr y envía vía TW send-transaction antes de considerar la disputa on-chain.',
      });
    }

    return secureJsonResponse(req, {
      network,
      success: true,
      task_id: taskId,
      escrow_status: 'disputed',
      signer_wallet: signerWallet,
      dispute_id: disputeId,
      reason,
    });
  } catch (e) {
    return secureErrorResponse(req, e instanceof Error ? e.message : 'Error');
  }
});
