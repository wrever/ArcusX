import { requireSupabaseAdmin } from '../_shared/admin-auth.ts';
import { getRepository } from '../_shared/repository.ts';
import { createSecurityAlert } from '../_shared/monitoring.ts';
import {
  handleSecureOptions,
  readJsonBody,
  sanitizeLogMetadata,
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
    const admin = await requireSupabaseAdmin(req);
    const body = await readJsonBody<Record<string, unknown>>(req);

    const taskId = Number(body.task_id);
    const frozen = body.frozen === true;
    const reason = (body.reason as string) ?? 'Freeze administrativo';

    if (!taskId) return secureErrorResponse(req, 'task_id requerido');

    const repo = getRepository();
    const escrow = await repo.getEscrowByTaskId(taskId);
    if (!escrow) return secureErrorResponse(req, 'Escrow no encontrado', 404);

    await repo.setEscrowFrozen(taskId, frozen, reason);

    await repo.writeAuditLog({
      taskId,
      escrowPublicKey: escrow.escrow_public_key,
      actorUserId: admin.userId,
      action: frozen ? 'admin_freeze' : 'admin_unfreeze',
      metadata: sanitizeLogMetadata({ reason }),
    });

    if (frozen) {
      await createSecurityAlert({
        severity: 'high',
        alertType: 'escrow_frozen',
        message: `Escrow congelado task ${taskId}`,
        taskId,
        escrowPublicKey: escrow.escrow_public_key,
        details: { reason, admin_id: admin.userId },
      });
    }

    return secureJsonResponse(req, {
      success: true,
      task_id: taskId,
      frozen,
      escrow_public_key: escrow.escrow_public_key,
      escrow_id: escrow.escrow_public_key,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return secureErrorResponse(req, msg, msg.includes('No autorizado') ? 403 : 400);
  }
});
