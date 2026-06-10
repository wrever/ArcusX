import { requireSupabaseAdmin } from '../_shared/admin-auth.ts';
import { getRepository } from '../_shared/repository.ts';
import { buildPagination } from '../_shared/pagination.ts';
import {
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
    await requireSupabaseAdmin(req);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const repo = getRepository();

    const disputeId = body.dispute_id as string | undefined;
    if (disputeId) {
      const dispute = await repo.getDisputeById(disputeId);
      if (!dispute) {
        return secureErrorResponse(req, 'Disputa no encontrada', 404);
      }
      return secureJsonResponse(req, {
        success: true,
        dispute,
      });
    }

    const page = Math.max(1, Number(body.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(body.limit) || 20));
    const status = (body.status as string) || undefined;

    const { rows, total } = await repo.listDisputesAdmin({ page, limit, status });

    return secureJsonResponse(req, {
      success: true,
      disputes: rows,
      pagination: buildPagination(page, limit, total),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return secureErrorResponse(req, msg, msg.includes('No autorizado') ? 403 : 400);
  }
});
