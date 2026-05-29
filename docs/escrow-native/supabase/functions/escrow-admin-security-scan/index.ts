import { requireSupabaseAdmin } from '../_shared/admin-auth.ts';
import { getRepository } from '../_shared/repository.ts';
import { runEscrowIntegrityCheck } from '../_shared/monitoring.ts';
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
    enforceRateLimit(req, 'admin-security-scan', 3, 60_000);
    await requireSupabaseAdmin(req);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const repo = getRepository();

    const escrowPublicKey = body.escrow_public_key as string | undefined;
    const scanActive = body.scan_all_active === true;

    if (escrowPublicKey) {
      const row = await repo.getEscrowByPublicKey(escrowPublicKey).catch(() => null);
      const result = await runEscrowIntegrityCheck(
        escrowPublicKey,
        row?.task_id,
      );
      return secureJsonResponse(req, { success: true, results: [result] });
    }

    if (scanActive) {
      const { rows } = await repo.listEscrowsAdmin({
        page: 1,
        limit: 50,
        status: 'active',
      });
      const disputedPage = await repo.listEscrowsAdmin({
        page: 1,
        limit: 50,
        status: 'disputed',
      });
      const all = [...rows, ...disputedPage.rows];
      const results = [];
      for (const e of all) {
        results.push(
          await runEscrowIntegrityCheck(e.escrow_public_key, e.task_id),
        );
      }
      return secureJsonResponse(req, {
        success: true,
        scanned: results.length,
        results,
        failures: results.filter((r) => !r.multisigOk).length,
      });
    }

    const recent = await repo.listIntegrityChecks(30);
    return secureJsonResponse(req, { success: true, recent_checks: recent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return secureErrorResponse(req, msg, msg.includes('No autorizado') ? 403 : 400);
  }
});
