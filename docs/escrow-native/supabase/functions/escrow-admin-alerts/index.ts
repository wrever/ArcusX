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
    const admin = await requireSupabaseAdmin(req);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const repo = getRepository();

    if (body.action === 'acknowledge') {
      const alertId = body.alert_id as string;
      if (!alertId) return secureErrorResponse(req, 'alert_id requerido');
      await repo.acknowledgeSecurityAlert(alertId, admin.userId);
      return secureJsonResponse(req, { success: true });
    }

    const page = Math.max(1, Number(body.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(body.limit) || 30));
    const acknowledged = body.acknowledged === true
      ? true
      : body.acknowledged === false
      ? false
      : undefined;
    const severity = body.severity as string | undefined;

    const { rows, total } = await repo.listSecurityAlerts({
      page,
      limit,
      acknowledged,
      severity,
    });

    return secureJsonResponse(req, {
      success: true,
      alerts: rows,
      pagination: buildPagination(page, limit, total),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return secureErrorResponse(req, msg, msg.includes('No autorizado') ? 403 : 400);
  }
});
