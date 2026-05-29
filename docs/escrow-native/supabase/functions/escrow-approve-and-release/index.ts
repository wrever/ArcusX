import {
  isSorobanContractId,
  prepareApproveAndRelease,
  verifyContractFunded,
} from '../_shared/soroban-escrow.ts';
import { getStellarConfig } from '../_shared/stellar-network.ts';
import { getRepository } from '../_shared/repository.ts';
import {
  requireAuth,
  requireTaskMembership,
  requireWalletParticipant,
  assertWalletMatchesMembership,
} from '../_shared/auth.ts';
import {
  assertAmountsMatch,
  assertStellarAddress,
} from '../_shared/validation.ts';
import { assertEscrowStatus } from '../_shared/guards.ts';
import { assertEscrowNotFrozen } from '../_shared/monitoring.ts';
import {
  enforceRateLimit,
  handleSecureOptions,
  readJsonBody,
  secureErrorResponse,
  secureJsonResponse,
} from '../_shared/security.ts';

Deno.serve(async (req) => {
  const options = handleSecureOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return secureErrorResponse(req, 'Method not allowed', 405);
  }

  try {
    enforceRateLimit(req, 'approve-and-release', 10, 60_000);
    const auth = await requireAuth(req);
    const body = await readJsonBody<Record<string, unknown>>(req);

    const taskId = body.task_id;
    const clientWallet = body.client_wallet as string;
    const escrowPublicKey = body.escrow_public_key as string;
    const freelancerWallet = body.freelancer_wallet as string;
    const freelancerPayout = body.freelancer_payout as string;
    const platformTotal = body.platform_total as string;

    if (
      taskId == null || !clientWallet || !escrowPublicKey || !freelancerWallet ||
      !freelancerPayout || !platformTotal
    ) {
      return secureErrorResponse(req, 'Campos requeridos incompletos');
    }

    assertStellarAddress(clientWallet, 'client_wallet');
    requireWalletParticipant(
      clientWallet,
      clientWallet,
      freelancerWallet,
    );

    const repo = getRepository();
    const taskNum = Number(taskId);

    if (auth) {
      const member = await requireTaskMembership(
        auth.userId,
        taskNum,
        ['client', 'admin'],
      );
      assertWalletMatchesMembership(clientWallet, member.wallet);
    }

    const escrow = await repo.getEscrowByTaskId(taskNum).catch(() => null);
    const idempotencyKey = req.headers.get('Idempotency-Key')?.trim();

    if (escrow) {
      if (escrow.escrow_public_key !== escrowPublicKey) {
        return secureErrorResponse(req, 'escrow_public_key no coincide', 409);
      }

      if (idempotencyKey) {
        const prior = await repo.getIdempotentRelease(idempotencyKey, taskNum)
          .catch(() => null);
        if (prior) {
          const { network, explorerTxUrl } = getStellarConfig();
          return secureJsonResponse(req, {
            network,
            success: true,
            idempotent: true,
            task_id: taskId,
            tx_hash: prior,
            escrow_status: 'completed',
            explorer_tx_url: explorerTxUrl(prior),
          });
        }
      }

      if (escrow.release_tx_hash) {
        const { network, explorerTxUrl } = getStellarConfig();
        return secureJsonResponse(req, {
          network,
          success: true,
          idempotent: true,
          task_id: taskId,
          tx_hash: escrow.release_tx_hash,
          escrow_status: 'completed',
          explorer_tx_url: explorerTxUrl(escrow.release_tx_hash),
        });
      }

      assertEscrowStatus(escrow.escrow_status, 'active');
      assertEscrowNotFrozen(escrow.frozen_at);

      assertAmountsMatch(
        escrow.freelancer_payout ?? freelancerPayout,
        freelancerPayout,
        'freelancer_payout',
      );
      assertAmountsMatch(
        escrow.platform_fee_total ?? platformTotal,
        platformTotal,
        'platform_total',
      );

      const milestone = await repo.getMilestoneStatus(taskNum).catch(
        () => null,
      );
      if (milestone && milestone !== 'completed' && milestone !== 'approved') {
        return secureErrorResponse(
          req,
          'El milestone debe estar completed antes de liberar',
          409,
        );
      }

    }

    if (!isSorobanContractId(escrowPublicKey)) {
      return secureErrorResponse(
        req,
        'Solo escrows Soroban (C…) soportados',
        400,
      );
    }

    const clientTotal = escrow?.client_total ??
      (parseFloat(freelancerPayout) + parseFloat(platformTotal)).toFixed(7);

    const minFund = parseFloat(escrow?.client_total ?? clientTotal);
    if (Number.isFinite(minFund) && minFund > 0) {
      const funded = await verifyContractFunded(escrowPublicKey, minFund * 0.99);
      if (!funded.ok && funded.balance < minFund * 0.99) {
        return secureErrorResponse(
          req,
          'Escrow sin fondos suficientes para liberar',
          422,
        );
      }
    }

    const { network } = getStellarConfig();

    const prepared = await prepareApproveAndRelease({
      contractId: escrowPublicKey,
      approver: clientWallet,
      releaseSigner: clientWallet,
      milestoneIndex: '0',
    });

    return secureJsonResponse(req, {
      network,
      success: true,
      task_id: taskId,
      escrow_type: 'soroban',
      requires_client_signature: true,
      contract_id: escrowPublicKey,
      unsigned_approve_xdr: prepared.unsignedApproveXdr ?? null,
      unsigned_release_xdr: prepared.unsignedReleaseXdr,
      milestone_already_approved: prepared.milestoneAlreadyApproved ?? false,
      escrow_status: escrow?.escrow_status ?? 'active',
      message:
        'Firma approve (si aplica) y release; POST escrow-approve-and-release-confirm con signed_release_xdr (+ signed_approve_xdr).',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno';
    const status = message.includes('no configurado') ? 503
      : message.includes('No autorizado') ? 403
      : message.includes('Demasiadas') ? 429
      : 400;
    return secureErrorResponse(req, message, status);
  }
});
