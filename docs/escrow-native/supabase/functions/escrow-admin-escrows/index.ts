import { requireSupabaseAdmin } from '../_shared/admin-auth.ts';
import { getRepository } from '../_shared/repository.ts';
import { getStellarConfig } from '../_shared/stellar-network.ts';
import {
  isSorobanContractId,
  verifyContractFunded,
} from '../_shared/soroban-escrow.ts';
import { buildPagination } from '../_shared/pagination.ts';
import {
  handleSecureOptions,
  readJsonBody,
  secureErrorResponse,
  secureJsonResponse,
} from '../_shared/security.ts';

function mapEscrowForAdminPanel(row: Record<string, unknown>) {
  const pk = String(row.escrow_public_key);
  return {
    ...row,
    escrow_id: pk,
    escrow_provider: 'native',
    is_native: true,
  };
}

Deno.serve(async (req) => {
  const options = handleSecureOptions(req);
  if (options) return options;
  if (req.method !== 'POST') {
    return secureErrorResponse(req, 'Method not allowed', 405);
  }

  try {
    await requireSupabaseAdmin(req);
    const body = await readJsonBody<Record<string, unknown>>(req);

    const page = Math.max(1, Number(body.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(body.limit) || 20));
    const status = (body.escrow_status ?? body.status) as string | undefined;
    const search = body.search as string | undefined;
    const frozenOnly = body.frozen_only === true;
    const enrichHorizon = body.enrich_horizon === true;
    const taskId = body.task_id != null ? Number(body.task_id) : undefined;

    const repo = getRepository();

    if (taskId) {
      const row = await repo.getEscrowByTaskId(taskId);
      if (!row) return secureErrorResponse(req, 'Escrow no encontrado', 404);

      let horizon = null;
      if (enrichHorizon) {
        const pk = row.escrow_public_key;
        const { explorerAccountUrl, explorerTxUrl } = getStellarConfig();
        if (isSorobanContractId(pk)) {
          const verified = await verifyContractFunded(pk, 0);
          horizon = {
            escrow_type: 'soroban',
            exists: true,
            balance_usdc: String(verified.balance),
            is_funded: verified.ok || verified.balance > 0,
            explorer_account_url: explorerAccountUrl(pk),
            explorer_fund_tx: row.fund_tx_hash
              ? explorerTxUrl(row.fund_tx_hash)
              : null,
            explorer_release_tx: row.release_tx_hash
              ? explorerTxUrl(row.release_tx_hash)
              : null,
          };
        } else {
          horizon = {
            escrow_type: 'unsupported',
            error: 'Solo contratos C… soportados',
          };
        }
      }

      const milestone = await repo.getMilestoneStatus(taskId).catch(() => null);
      const audit = await repo.listAuditLog({ taskId, limit: 50 }).catch(() => []);

      return secureJsonResponse(req, {
        success: true,
        escrow: mapEscrowForAdminPanel(row as unknown as Record<string, unknown>),
        milestone_status: milestone,
        horizon,
        audit_log: audit,
      });
    }

    const { rows, total } = await repo.listEscrowsAdmin({
      page,
      limit,
      status,
      search,
      frozenOnly,
    });

    const { network } = getStellarConfig();

    return secureJsonResponse(req, {
      success: true,
      provider: 'native',
      network,
      escrows: rows.map((r) =>
        mapEscrowForAdminPanel(r as unknown as Record<string, unknown>)
      ),
      pagination: buildPagination(page, limit, total),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return secureErrorResponse(req, msg, msg.includes('No autorizado') ? 403 : 400);
  }
});
