import { requireSupabaseAdmin } from '../_shared/admin-auth.ts';
import { getRepository } from '../_shared/repository.ts';
import { getStellarConfig } from '../_shared/stellar-network.ts';
import {
  handleSecureOptions,
  secureErrorResponse,
  secureJsonResponse,
} from '../_shared/security.ts';

Deno.serve(async (req) => {
  const options = handleSecureOptions(req);
  if (options) return options;
  if (req.method !== 'POST' && req.method !== 'GET') {
    return secureErrorResponse(req, 'Method not allowed', 405);
  }

  try {
    await requireSupabaseAdmin(req);
    const repo = getRepository();
    const stats = await repo.getAdminStats();
    const { network, explorerBaseUrl } = getStellarConfig();

    return secureJsonResponse(req, {
      success: true,
      provider: 'native',
      network,
      explorer_base_url: explorerBaseUrl,
      stats: {
        ...stats,
        total_escrows_native: stats.total_escrows,
        active_escrows_native: stats.active_count,
        disputed_escrows_native: stats.disputed_count,
        locked_usdc_native: stats.locked_usdc,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return secureErrorResponse(req, msg, msg.includes('No autorizado') ? 403 : 400);
  }
});
