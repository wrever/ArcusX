import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { hashWithSalt, normalizeRefCode, clientIp } from '../_shared/referral-crypto.ts';
import { supabaseService } from '../_shared/referral-db.ts';
import { assertPublicApiRateLimit } from '../_shared/referral-rate-limit.ts';
import {
  assertPublicBrowserOrigin,
  invalidCodePayload,
} from '../_shared/referral-public-guard.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    let code = '';
    let deviceFp = '';
    let trackVisit = false;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      code = url.searchParams.get('code') ?? '';
      deviceFp = url.searchParams.get('device_fp') ?? '';
      trackVisit = url.searchParams.get('track_visit') === '1';
    } else {
      const body = await req.json();
      code = body?.code ?? '';
      deviceFp = body?.device_fp ?? '';
      trackVisit = Boolean(body?.track_visit);
    }

    const refCode = normalizeRefCode(code);
    if (!refCode) {
      return errorResponse(req, 'code requerido');
    }
    if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(refCode)) {
      return jsonResponse(req, invalidCodePayload());
    }

    assertPublicBrowserOrigin(req);
    const supabase = supabaseService();
    const ip = clientIp(req);
    await assertPublicApiRateLimit(supabase, ip, 'resolve-code');
    const { data: row } = await supabase
      .from('referral_codes')
      .select(`
        id,
        code,
        label,
        is_active,
        expires_at,
        referral_partners!inner ( display_name, is_active )
      `)
      .eq('code', refCode)
      .eq('is_active', true)
      .maybeSingle();

    if (!row) {
      return jsonResponse(req, invalidCodePayload());
    }

    const partner = row.referral_partners as { display_name: string; is_active: boolean };
    if (!partner.is_active) {
      return jsonResponse(req, invalidCodePayload());
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return jsonResponse(req, invalidCodePayload());
    }

    if (trackVisit) {
      const ipHash = await hashWithSalt(clientIp(req));
      const deviceHash = deviceFp ? await hashWithSalt(deviceFp) : null;
      const uaHash = await hashWithSalt(req.headers.get('user-agent') ?? '');
      const { error: visitErr } = await supabase.from('referral_link_visits').insert({
        code_id: row.id,
        ref_code: refCode,
        visitor_ip_hash: ipHash || null,
        device_fp_hash: deviceHash,
        user_agent_hash: uaHash || null,
      });
      if (visitErr) {
        console.warn('referral_link_visits:', visitErr.message);
      }
    }

    return jsonResponse(req, {
      success: true,
      valid: true,
      code: row.code,
      label: row.label,
      partner_name: partner.display_name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    if (msg.includes('Demasiados') || msg.includes('Origen')) {
      return errorResponse(req, msg, msg.includes('Demasiados') ? 429 : 403);
    }
    return errorResponse(req, msg, 500);
  }
});
