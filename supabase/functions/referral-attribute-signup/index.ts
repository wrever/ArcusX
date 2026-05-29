import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { hashWithSalt, normalizeRefCode } from '../_shared/referral-crypto.ts';
import { assertReferralCaller, isReferralInternalCaller } from '../_shared/referral-auth.ts';
import {
  createFraudAlert,
  runFraudChecks,
  type FraudInput,
} from '../_shared/referral-fraud.ts';
import {
  bumpCodeCounters,
  refreshPartnerDaily,
  supabaseService,
} from '../_shared/referral-db.ts';
import {
  markPendingClaimed,
  resolvePendingRefCode,
} from '../_shared/referral-pending.ts';

interface AttributeBody {
  ref_code: string;
  supabase_user_id: string;
  mysql_user_id?: number | null;
  email: string;
  is_new_user: boolean;
  signup_ip?: string;
  device_fp?: string;
  user_agent?: string;
  oauth_provider?: string;
  oauth_subject?: string;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    const body = await req.json() as AttributeBody;

    if (!body.supabase_user_id || !body.email) {
      return errorResponse(req, 'supabase_user_id y email requeridos');
    }

    await assertReferralCaller(req, body.supabase_user_id);

    const supabase = supabaseService();

    let refCode = normalizeRefCode(body.ref_code ?? '');
    if (!refCode && body.device_fp) {
      const pending = await resolvePendingRefCode(supabase, body.device_fp);
      if (pending) refCode = pending;
    }

    if (!refCode) {
      return jsonResponse(req, {
        success: true,
        attributed: false,
        reason: 'no_ref_code',
      });
    }

    if (!isReferralInternalCaller(req)) {
      const fp = body.device_fp?.trim() ?? '';
      if (!fp) {
        return jsonResponse(req, {
          success: true,
          attributed: false,
          reason: 'bind_required',
        });
      }
      const boundCode = await resolvePendingRefCode(supabase, fp);
      if (!boundCode || boundCode !== refCode) {
        return jsonResponse(req, {
          success: true,
          attributed: false,
          reason: 'bind_required',
        });
      }
    }

    const { data: codeRow, error: codeErr } = await supabase
      .from('referral_codes')
      .select(`
        id,
        code,
        partner_id,
        is_active,
        expires_at,
        max_signups,
        signup_count,
        referral_partners!inner (
          id,
          display_name,
          is_active
        )
      `)
      .eq('code', refCode)
      .eq('is_active', true)
      .maybeSingle();

    if (codeErr || !codeRow) {
      return jsonResponse(req, {
        success: true,
        attributed: false,
        reason: 'invalid_code',
      });
    }

    const partner = codeRow.referral_partners as {
      id: string;
      display_name: string;
      is_active: boolean;
    };

    if (!partner.is_active) {
      return jsonResponse(req, {
        success: true,
        attributed: false,
        reason: 'partner_inactive',
      });
    }

    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      return jsonResponse(req, {
        success: true,
        attributed: false,
        reason: 'code_expired',
      });
    }

    if (
      codeRow.max_signups != null &&
      (codeRow.signup_count ?? 0) >= codeRow.max_signups
    ) {
      return jsonResponse(req, {
        success: true,
        attributed: false,
        reason: 'code_max_signups',
      });
    }

    const fraudInput: FraudInput = {
      refCode,
      supabaseUserId: body.supabase_user_id,
      mysqlUserId: body.mysql_user_id ?? null,
      email: body.email,
      isNewUser: body.is_new_user !== false,
      signupIp: body.signup_ip ?? '',
      deviceFp: body.device_fp ?? '',
      userAgent: body.user_agent ?? '',
      oauthProvider: body.oauth_provider ?? '',
      oauthSubject: body.oauth_subject ?? '',
    };

    const fraud = await runFraudChecks(supabase, fraudInput, {
      id: codeRow.id,
      partner_id: codeRow.partner_id,
      code: codeRow.code,
    });

    const signupIpHash = await hashWithSalt(fraudInput.signupIp);
    const deviceFpHash = await hashWithSalt(fraudInput.deviceFp);
    const userAgentHash = await hashWithSalt(fraudInput.userAgent);
    const oauthSubjectHash = fraudInput.oauthProvider && fraudInput.oauthSubject
      ? await hashWithSalt(
        `${fraudInput.oauthProvider}:${fraudInput.oauthSubject}`,
      )
      : null;

    const status = fraud.rejected ? 'rejected' : 'valid';
    const signupDate = new Date().toISOString().slice(0, 10);

    const { data: signup, error: insertErr } = await supabase
      .from('referral_signups')
      .insert({
        code_id: codeRow.id,
        partner_id: codeRow.partner_id,
        supabase_user_id: body.supabase_user_id,
        mysql_user_id: body.mysql_user_id ?? null,
        ref_code: refCode,
        partner_display_name: partner.display_name,
        signup_ip_hash: signupIpHash || null,
        device_fp_hash: deviceFpHash || null,
        user_agent_hash: userAgentHash || null,
        oauth_provider: fraudInput.oauthProvider || null,
        oauth_subject_hash: oauthSubjectHash,
        is_new_user: fraudInput.isNewUser,
        status,
        rejection_reason: fraud.rejection_reason,
      })
      .select('id')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return jsonResponse(req, {
          success: true,
          attributed: false,
          reason: 'already_attributed',
        });
      }
      throw new Error(insertErr.message);
    }

    if (fraud.flags.length > 0) {
      await supabase.from('referral_flags').insert(
        fraud.flags.map((f) => ({
          signup_id: signup.id,
          flag_type: f.flag_type,
          detail: f.detail,
        })),
      );
    }

    if (deviceFpHash) {
      await supabase.from('referral_device_registry').upsert({
        device_fp_hash: deviceFpHash,
        supabase_user_id: body.supabase_user_id,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'device_fp_hash,supabase_user_id' });
    }

    if (oauthSubjectHash && fraudInput.oauthProvider) {
      await supabase.from('referral_oauth_registry').upsert({
        oauth_provider: fraudInput.oauthProvider,
        oauth_subject_hash: oauthSubjectHash,
        supabase_user_id: body.supabase_user_id,
      }, { onConflict: 'oauth_provider,oauth_subject_hash' });
    }

    await bumpCodeCounters(supabase, codeRow.id, status === 'valid');
    await refreshPartnerDaily(supabase, codeRow.partner_id, signupDate);

    if (fraud.rejected) {
      await createFraudAlert(supabase, {
        signupId: signup.id,
        partnerId: codeRow.partner_id,
        codeId: codeRow.id,
        refCode,
        partnerDisplayName: partner.display_name,
        flags: fraud.flags,
        metadata: {
          supabase_user_id: body.supabase_user_id,
          mysql_user_id: body.mysql_user_id,
          email_domain: body.email.split('@')[1],
        },
      });
    }

    if (body.device_fp) {
      await markPendingClaimed(supabase, body.device_fp, body.supabase_user_id);
    }

    return jsonResponse(req, {
      success: true,
      attributed: true,
      signup_id: signup.id,
      status,
      counts_as_valid: status === 'valid',
      fraud_detected: fraud.rejected,
      flag_types: fraud.flags.map((f) => f.flag_type),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    const status = msg.includes('No autorizado') ? 401 : 500;
    return errorResponse(req, msg, status);
  }
});
