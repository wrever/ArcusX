import {
  isSorobanContractId,
  verifyContractFunded,
} from '../_shared/soroban-escrow.ts';
import { getStellarConfig } from '../_shared/stellar-network.ts';
import { getRepository } from '../_shared/repository.ts';
import { requireAuth } from '../_shared/auth.ts';
import { assertEscrowStatus, assertEscrowTransition } from '../_shared/guards.ts';
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    await requireAuth(req);

    const body = await req.json();
    const { task_id: taskId, escrow_public_key: escrowPublicKey } = body ?? {};
    if (!taskId || !escrowPublicKey) {
      return errorResponse('task_id y escrow_public_key requeridos');
    }

    if (!isSorobanContractId(escrowPublicKey)) {
      return errorResponse('Solo escrows Soroban (C…) soportados', 400);
    }

    const verified = await verifyContractFunded(escrowPublicKey, 0);
    if (verified.balance > 0) {
      return errorResponse(
        'Escrow con USDC; usar disputa o liberación',
        409,
      );
    }

    const repo = getRepository();
    const escrow = await repo.getEscrowByTaskId(Number(taskId)).catch(() => null);

    if (escrow) {
      assertEscrowStatus(
        escrow.escrow_status,
        ['pending_funding', 'active', 'disputed'],
      );
      assertEscrowTransition(escrow.escrow_status, 'cancelled');
    }

    if (escrow) {
      try {
        await repo.updateEscrowStatus(Number(taskId), 'cancelled', {});
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : '';
        if (!msg.includes('no conectada')) throw dbErr;
      }
    }

    const { network } = getStellarConfig();

    return jsonResponse({
      network,
      success: true,
      task_id: taskId,
      escrow_status: 'cancelled',
      message:
        'Cancelación registrada en BD. Contrato Soroban vacío; no requiere tx on-chain.',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error';
    return errorResponse(message, 400);
  }
});
