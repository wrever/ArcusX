import {
  platformFeeDecimalFromBps,
  quoteFees,
  quoteFeesTrustlessWorkBridge,
} from '../_shared/fees.ts';
import { getFeeBpsFromEnv } from '../_shared/config.ts';
import { getStellarConfig } from '../_shared/stellar-network.ts';
import { getRepository } from '../_shared/repository.ts';
import { requireAuth, requireTaskMembership } from '../_shared/auth.ts';
import {
  enforceRateLimit,
  handleSecureOptions,
  hashIpForAudit,
  readJsonBody,
  sanitizeLogMetadata,
  secureErrorResponse,
  secureJsonResponse,
} from '../_shared/security.ts';
import {
  assertStellarAddress,
  parseWorkerAmount,
} from '../_shared/validation.ts';
import { assertParticipantsTrustlines } from '../_shared/preflight.ts';
import {
  getUsdcTrustlineForNetwork,
  trustlineParticipantChecklist,
} from '../_shared/trustline.ts';
import {
  prepareDeploySingleRelease,
  prepareFundEscrow,
} from '../_shared/soroban-escrow.ts';

Deno.serve(async (req) => {
  const options = handleSecureOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return secureErrorResponse(req, 'Method not allowed', 405);
  }

  try {
    enforceRateLimit(req, 'create-and-fund-prepare', 5, 60_000);
    const auth = await requireAuth(req);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const {
      task_id: taskId,
      proposal_id: proposalId,
      client_wallet: clientWallet,
      freelancer_wallet: freelancerWallet,
      worker_amount: workerAmount,
      title,
      description,
      /** Si ya se desplegó el contrato: solo preparar fund */
      contract_id: existingContractId,
    } = body ?? {};

    const taskNum = Number(taskId);

    if (!taskId || !clientWallet || !freelancerWallet || !workerAmount) {
      return secureErrorResponse(
        req,
        'task_id, client_wallet, freelancer_wallet, worker_amount requeridos',
      );
    }

    if (auth) {
      await requireTaskMembership(auth.userId, taskNum, ['client', 'admin']);
    }

    assertStellarAddress(clientWallet, 'client_wallet');
    assertStellarAddress(freelancerWallet, 'freelancer_wallet');
    parseWorkerAmount(workerAmount);
    await assertParticipantsTrustlines(clientWallet, freelancerWallet);

    const repo = getRepository();
    let clientFeeBps: number;
    let freelancerFeeBps: number;
    try {
      ({ clientFeeBps, freelancerFeeBps } = await repo.getFeeBpsFromDb());
    } catch {
      ({ clientFeeBps, freelancerFeeBps } = getFeeBpsFromEnv());
    }

    const existing = await repo.getEscrowByTaskId(taskNum).catch(() => null);
    if (existing?.escrow_status === 'active') {
      return secureErrorResponse(req, 'La tarea ya tiene escrow activo', 409);
    }

    const feeQuote = quoteFees(workerAmount, clientFeeBps, freelancerFeeBps);
    const platformFeeDecimal = platformFeeDecimalFromBps(
      clientFeeBps,
      freelancerFeeBps,
    );
    const twOnChain = quoteFeesTrustlessWorkBridge(
      workerAmount,
      platformFeeDecimal,
    );
    const escrowFundAmount = parseFloat(twOnChain.escrow_fund_amount);
    const { network, platformWallet, adminWallet } = getStellarConfig();

    if (!platformWallet || !adminWallet) {
      return secureErrorResponse(
        req,
        'PLATFORM_WALLET y ADMIN_WALLET requeridos para roles del contrato',
        503,
      );
    }

    const engagementId = `arcusx-task-${taskId}`;

    let contractId = typeof existingContractId === 'string'
      ? existingContractId
      : existing?.escrow_public_key?.startsWith('C')
      ? existing.escrow_public_key
      : null;

    let unsignedDeployXdr: string | undefined;
    let unsignedFundXdr: string | undefined;

    if (!contractId) {
      const deploy = await prepareDeploySingleRelease({
        signer: clientWallet,
        engagementId,
        title: typeof title === 'string' ? title : `ArcusX task ${taskId}`,
        description: typeof description === 'string'
          ? description
          : `Escrow task ${taskId}`,
        approver: clientWallet,
        serviceProvider: freelancerWallet,
        receiver: freelancerWallet,
        platformAddress: platformWallet,
        disputeResolver: adminWallet,
        amount: escrowFundAmount,
        platformFee: platformFeeDecimal,
        milestoneDescription: typeof description === 'string'
          ? description
          : `Milestone task ${taskId}`,
      });
      unsignedDeployXdr = deploy.unsignedDeployXdr;

      try {
        await repo.insertEscrow({
          task_id: taskNum,
          proposal_id: proposalId != null ? Number(proposalId) : undefined,
          escrow_public_key: `pending-${taskId}`,
          escrow_secret_enc: '',
          escrow_status: 'pending_deploy',
          worker_amount: feeQuote.worker_amount,
          client_wallet: clientWallet,
          freelancer_wallet: freelancerWallet,
          client_total: feeQuote.client_total,
          freelancer_payout: feeQuote.freelancer_payout,
          platform_fee_total: feeQuote.platform_total,
        });
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : '';
        if (!msg.includes('no conectada')) throw dbErr;
      }
    } else {
      const fund = await prepareFundEscrow({
        contractId,
        signer: clientWallet,
        amount: escrowFundAmount,
      });
      unsignedFundXdr = fund.unsignedFundXdr;
    }

    const ipHash = await hashIpForAudit(req);
    try {
      await repo.writeAuditLog({
        taskId: taskNum,
        actorUserId: auth?.userId,
        action: contractId ? 'fund_prepare' : 'deploy_prepare',
        metadata: sanitizeLogMetadata({
          task_id: taskId,
          contract_id: contractId,
        }),
        ipHash,
      });
    } catch { /* audit best-effort */ }

    const usdc_trustline = getUsdcTrustlineForNetwork(network);

    return secureJsonResponse(req, {
      network,
      task_id: taskId,
      escrow_type: 'soroban',
      contract_id: contractId,
      unsigned_deploy_xdr: unsignedDeployXdr,
      unsigned_fund_xdr: unsignedFundXdr,
      /** Alias legacy — valor = contract_id C… tras deploy */
      unsigned_xdr: unsignedFundXdr ?? unsignedDeployXdr,
      fee_quote: feeQuote,
      tw_on_chain_quote: twOnChain,
      usdc_trustline,
      trustline_checklist: trustlineParticipantChecklist(),
      phase_s1_note:
        'Fase S1 (TW): fund/deploy usan tw_on_chain_quote. Todos los participantes necesitan trustline USDC al issuer G… indicado.',
      escrow_status: contractId ? 'pending_funding' : 'pending_deploy',
      steps: contractId
        ? ['sign_fund_xdr', 'confirm_fund']
        : ['sign_deploy_xdr', 'confirm_deploy', 'prepare_fund', 'sign_fund_xdr', 'confirm_fund'],
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
