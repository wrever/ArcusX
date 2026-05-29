import {
  platformFeeDecimalFromBps,
  quoteFees,
  quoteFeesTrustlessWorkBridge,
} from '../_shared/fees.ts';
import { getUsdcTrustlineForNetwork, trustlineParticipantChecklist } from '../_shared/trustline.ts';
import { getFeeBpsFromEnv } from '../_shared/config.ts';
import { getRepository } from '../_shared/repository.ts';
import { getStellarConfig } from '../_shared/stellar-network.ts';
import { parseWorkerAmount } from '../_shared/validation.ts';
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const workerAmount = body?.worker_amount;
    if (!workerAmount) {
      return errorResponse('worker_amount requerido');
    }

    parseWorkerAmount(workerAmount);

    const repo = getRepository();
    let clientFeeBps: number;
    let freelancerFeeBps: number;
    try {
      ({ clientFeeBps, freelancerFeeBps } = await repo.getFeeBpsFromDb());
    } catch {
      ({ clientFeeBps, freelancerFeeBps } = getFeeBpsFromEnv());
    }

    const quote = quoteFees(workerAmount, clientFeeBps, freelancerFeeBps);
    const platformFeeDecimal = platformFeeDecimalFromBps(
      clientFeeBps,
      freelancerFeeBps,
    );
    const twOnChain = quoteFeesTrustlessWorkBridge(
      workerAmount,
      platformFeeDecimal,
    );
    const { network } = getStellarConfig();
    const usdc_trustline = getUsdcTrustlineForNetwork(network);

    return jsonResponse({
      network,
      ...quote,
      tw_on_chain_quote: twOnChain,
      usdc_trustline,
      trustline_checklist: trustlineParticipantChecklist(),
      escrow_model: {
        phase_s1: 'Trustless Work API (mismo C…, mismo issuer USDC G…)',
        phase_s2: 'WASM arcusx-escrow (comisión bilateral on-chain)',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno';
    return errorResponse(message);
  }
});
