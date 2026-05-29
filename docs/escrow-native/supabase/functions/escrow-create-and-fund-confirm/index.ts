import { getStellarConfig } from '../_shared/stellar-network.ts';
import { getRepository } from '../_shared/repository.ts';
import { requireAuth } from '../_shared/auth.ts';
import { assertEscrowTransition } from '../_shared/guards.ts';
import {
  handleSecureOptions,
  readJsonBody,
  secureErrorResponse,
  secureJsonResponse,
} from '../_shared/security.ts';
import { getFeeBpsFromEnv } from '../_shared/config.ts';
import {
  platformFeeDecimalFromBps,
  quoteFeesTrustlessWorkBridge,
} from '../_shared/fees.ts';
import {
  twSendTransaction,
  verifyContractFunded,
} from '../_shared/soroban-escrow.ts';

Deno.serve(async (req) => {
  const options = handleSecureOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return secureErrorResponse(req, 'Method not allowed', 405);
  }

  try {
    await requireAuth(req);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const {
      task_id: taskId,
      signed_xdr: signedXdr,
      tx_hash: txHash,
      contract_id: contractIdBody,
      client_total: clientTotal,
      phase,
    } = body ?? {};

    if (!taskId) {
      return secureErrorResponse(req, 'task_id requerido');
    }

    const repo = getRepository();
    const escrow = await repo.getEscrowByTaskId(Number(taskId)).catch(() => null);
    const phaseNorm = phase === 'deploy' || phase === 'fund' ? phase : 'fund';

    if (phaseNorm === 'deploy') {
      if (!signedXdr) {
        return secureErrorResponse(req, 'signed_xdr requerido para phase=deploy');
      }
      const sent = await twSendTransaction(signedXdr);
      const contractId = sent.contractId;
      if (!contractId?.startsWith('C')) {
        return secureErrorResponse(
          req,
          'Deploy sin contractId Soroban en respuesta TW',
          422,
        );
      }

      if (escrow) {
        await repo.updateEscrowStatus(Number(taskId), 'pending_funding', {
          escrow_public_key: contractId,
          setup_tx_hash: sent.hash ?? txHash ?? null,
        });
      }

      const { network, explorerTxUrl } = getStellarConfig();
      return secureJsonResponse(req, {
        network,
        success: true,
        phase: 'deploy',
        task_id: taskId,
        contract_id: contractId,
        escrow_public_key: contractId,
        escrow_status: 'pending_funding',
        deploy_tx_hash: sent.hash ?? txHash,
        explorer_tx_url: (sent.hash ?? txHash)
          ? explorerTxUrl(String(sent.hash ?? txHash))
          : undefined,
        next: 'POST create-and-fund-prepare con contract_id para obtener fund XDR',
      });
    }

    const contractId = (contractIdBody as string) ??
      escrow?.escrow_public_key;
    if (!contractId?.startsWith('C')) {
      return secureErrorResponse(
        req,
        'contract_id (C…) requerido tras deploy',
      );
    }

    if (!clientTotal) {
      return secureErrorResponse(req, 'client_total requerido');
    }

    let clientFeeBps = 150;
    let freelancerFeeBps = 150;
    try {
      const bps = await repo.getFeeBpsFromDb();
      clientFeeBps = bps.clientFeeBps;
      freelancerFeeBps = bps.freelancerFeeBps;
    } catch {
      const fromEnv = getFeeBpsFromEnv();
      clientFeeBps = fromEnv.clientFeeBps;
      freelancerFeeBps = fromEnv.freelancerFeeBps;
    }

    const workerAmount = escrow?.worker_amount;
    const expectedTotal = workerAmount
      ? quoteFeesTrustlessWorkBridge(
        workerAmount,
        platformFeeDecimalFromBps(clientFeeBps, freelancerFeeBps),
      ).escrow_fund_amount
      : (escrow?.client_total ?? clientTotal);
    if (escrow && escrow.escrow_public_key !== contractId) {
      return secureErrorResponse(req, 'contract_id no coincide con la tarea', 409);
    }

    if (signedXdr && !txHash) {
      const sent = await twSendTransaction(signedXdr);
      const fundHash = sent.hash;
      const verified = await verifyContractFunded(
        contractId,
        parseFloat(String(expectedTotal)),
      );
      if (!verified.ok) {
        return secureErrorResponse(
          req,
          'Contrato sin balance USDC suficiente tras fund',
          422,
        );
      }
      if (escrow) {
        assertEscrowTransition(escrow.escrow_status, 'active');
        await repo.updateEscrowStatus(Number(taskId), 'active', {
          fund_tx_hash: fundHash ?? null,
        });
      }
      const { network, explorerTxUrl } = getStellarConfig();
      return secureJsonResponse(req, {
        network,
        success: true,
        phase: 'fund',
        task_id: taskId,
        contract_id: contractId,
        escrow_status: 'active',
        balance: verified.balance,
        fund_tx_hash: fundHash,
        explorer_tx_url: fundHash ? explorerTxUrl(fundHash) : undefined,
      });
    }

    if (!txHash) {
      return secureErrorResponse(req, 'signed_xdr o tx_hash requerido para fund');
    }

    const verified = await verifyContractFunded(
      contractId,
      parseFloat(String(expectedTotal)),
    );
    if (!verified.ok) {
      return secureErrorResponse(req, 'Fondeo insuficiente en contrato Soroban', 422);
    }

    if (escrow) {
      assertEscrowTransition(escrow.escrow_status, 'active');
      await repo.updateEscrowStatus(Number(taskId), 'active', {
        fund_tx_hash: txHash,
      });
    }

    const { network, explorerTxUrl } = getStellarConfig();
    return secureJsonResponse(req, {
      network,
      success: true,
      phase: 'fund',
      task_id: taskId,
      contract_id: contractId,
      escrow_status: 'active',
      balance: verified.balance,
      explorer_tx_url: explorerTxUrl(txHash),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno';
    return secureErrorResponse(req, message);
  }
});
