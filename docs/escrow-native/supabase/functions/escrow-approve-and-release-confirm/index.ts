import { getStellarConfig } from '../_shared/stellar-network.ts';
import { getRepository } from '../_shared/repository.ts';
import {
  requireAuth,
  requireTaskMembership,
  requireWalletParticipant,
  assertWalletMatchesMembership,
} from '../_shared/auth.ts';
import { assertEscrowStatus } from '../_shared/guards.ts';
import {
  enforceRateLimit,
  handleSecureOptions,
  hashIpForAudit,
  readJsonBody,
  sanitizeLogMetadata,
  secureErrorResponse,
  secureJsonResponse,
} from '../_shared/security.ts';
import { twSendTransaction } from '../_shared/soroban-escrow.ts';

Deno.serve(async (req) => {
  const options = handleSecureOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return secureErrorResponse(req, 'Method not allowed', 405);
  }

  try {
    enforceRateLimit(req, 'approve-and-release-confirm', 10, 60_000);
    const auth = await requireAuth(req);
    const body = await readJsonBody<Record<string, unknown>>(req);

    const taskId = body.task_id;
    const clientWallet = body.client_wallet as string;
    const contractId = body.contract_id as string;
    const signedApproveXdr = body.signed_approve_xdr as string | undefined;
    const signedReleaseXdr = body.signed_release_xdr as string;

    if (taskId == null || !clientWallet || !contractId || !signedReleaseXdr) {
      return secureErrorResponse(
        req,
        'task_id, client_wallet, contract_id, signed_release_xdr requeridos',
      );
    }

    if (!contractId.startsWith('C')) {
      return secureErrorResponse(req, 'contract_id debe ser Soroban C…', 400);
    }

    const taskNum = Number(taskId);
    const repo = getRepository();

    if (auth) {
      const member = await requireTaskMembership(
        auth.userId,
        taskNum,
        ['client', 'admin'],
      );
      assertWalletMatchesMembership(clientWallet, member.wallet);
    }

    const escrow = await repo.getEscrowByTaskId(taskNum).catch(() => null);
    if (escrow) {
      requireWalletParticipant(
        clientWallet,
        escrow.client_wallet,
        escrow.freelancer_wallet,
      );
      if (escrow.escrow_public_key !== contractId) {
        return secureErrorResponse(req, 'contract_id no coincide', 409);
      }
      assertEscrowStatus(escrow.escrow_status, 'active');
    }

    let approveTxHash: string | undefined;
    if (signedApproveXdr) {
      const approveSent = await twSendTransaction(signedApproveXdr);
      approveTxHash = approveSent.hash;
    }

    const releaseSent = await twSendTransaction(signedReleaseXdr);
    const releaseTxHash = releaseSent.hash;
    if (!releaseTxHash) {
      return secureErrorResponse(req, 'Release sin hash en respuesta TW', 422);
    }

    const ipHash = await hashIpForAudit(req);
    if (escrow) {
      try {
        await repo.setMilestoneStatus(taskNum, 'approved');
        await repo.updateEscrowStatus(taskNum, 'completed', {
          release_tx_hash: releaseTxHash,
        });
        await repo.writeAuditLog({
          taskId: taskNum,
          escrowPublicKey: contractId,
          actorUserId: auth?.userId,
          action: 'approve_and_release_confirm',
          metadata: sanitizeLogMetadata({
            task_id: taskId,
            approve_tx_hash: approveTxHash,
            release_tx_hash: releaseTxHash,
          }),
          ipHash,
        });
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : '';
        if (!msg.includes('no conectada')) throw dbErr;
      }
    }

    const { network, explorerTxUrl } = getStellarConfig();
    return secureJsonResponse(req, {
      network,
      success: true,
      task_id: taskId,
      contract_id: contractId,
      escrow_type: 'soroban',
      escrow_status: 'completed',
      approve_tx_hash: approveTxHash,
      release_tx_hash: releaseTxHash,
      tx_hash: releaseTxHash,
      explorer_tx_url: explorerTxUrl(releaseTxHash),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno';
    return secureErrorResponse(req, message);
  }
});
