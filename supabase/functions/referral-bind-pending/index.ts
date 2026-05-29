import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { clientIp } from '../_shared/referral-crypto.ts';
import { supabaseService } from '../_shared/referral-db.ts';
import { bindPendingReferral } from '../_shared/referral-pending.ts';
import { assertPublicApiRateLimit } from '../_shared/referral-rate-limit.ts';
import { assertPublicBrowserOrigin } from '../_shared/referral-public-guard.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const refCode = String(body?.ref_code ?? '');
    const deviceFp = String(body?.device_fp ?? '');

    assertPublicBrowserOrigin(req);
    const supabase = supabaseService();
    const ip = clientIp(req);
    await assertPublicApiRateLimit(supabase, ip, 'bind-pending');
    const result = await bindPendingReferral(supabase, {
      refCode,
      deviceFp,
      signupIp: clientIp(req),
      userAgent: req.headers.get('user-agent') ?? '',
    });

    return jsonResponse(req, { success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    const status = msg.includes('Demasiados') ? 429
      : msg.includes('Origen') ? 403
      : 400;
    return errorResponse(req, msg, status);
  }
});
