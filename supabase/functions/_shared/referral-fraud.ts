import type { SupabaseClient } from '@supabase/supabase-js';
import { hashWithSalt } from './referral-crypto.ts';

export interface FraudInput {
  refCode: string;
  supabaseUserId: string;
  mysqlUserId: number | null;
  email: string;
  isNewUser: boolean;
  signupIp: string;
  deviceFp: string;
  userAgent: string;
  oauthProvider: string;
  oauthSubject: string;
}

export interface FraudFlag {
  flag_type: string;
  detail: Record<string, unknown>;
}

export interface FraudResult {
  flags: FraudFlag[];
  rejected: boolean;
  rejection_reason: string | null;
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  '10minutemail.com',
  'yopmail.com',
  'throwaway.email',
  'trashmail.com',
]);

export function assertInternalSecret(req: Request): void {
  const expected = Deno.env.get('REFERRAL_INTERNAL_SECRET');
  if (!expected) {
    throw new Error('REFERRAL_INTERNAL_SECRET no configurado');
  }
  const got = req.headers.get('x-referral-internal-secret') ??
    req.headers.get('X-Referral-Internal-Secret');
  if (got !== expected) {
    throw new Error('No autorizado');
  }
}

export async function runFraudChecks(
  supabase: SupabaseClient,
  input: FraudInput,
  codeRow: { id: string; partner_id: string; code: string },
): Promise<FraudResult> {
  const flags: FraudFlag[] = [];

  if (codeRow.code.startsWith('TRAP-') || codeRow.code.startsWith('HONEYPOT')) {
    flags.push({
      flag_type: 'honeypot',
      detail: { code: codeRow.code },
    });
  }

  if (!input.isNewUser) {
    flags.push({
      flag_type: 'existing_email',
      detail: { email_domain: input.email.split('@')[1] ?? '' },
    });
  }

  const emailDomain = (input.email.split('@')[1] ?? '').toLowerCase();
  if (DISPOSABLE_DOMAINS.has(emailDomain)) {
    flags.push({ flag_type: 'disposable_email', detail: { domain: emailDomain } });
  }

  const { data: priorUser } = await supabase
    .from('referral_signups')
    .select('id, status')
    .eq('supabase_user_id', input.supabaseUserId)
    .maybeSingle();

  if (priorUser) {
    flags.push({
      flag_type: 'duplicate_user',
      detail: { prior_status: priorUser.status },
    });
  }

  const ipHash = await hashWithSalt(input.signupIp);
  if (ipHash) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: ipSameCode } = await supabase
      .from('referral_signups')
      .select('id', { count: 'exact', head: true })
      .eq('code_id', codeRow.id)
      .eq('signup_ip_hash', ipHash)
      .gte('registered_at', since24h);

    if ((ipSameCode ?? 0) >= 3) {
      flags.push({
        flag_type: 'ip_cluster',
        detail: { count_24h: ipSameCode, scope: 'same_code' },
      });
    }

    const { count: ipGlobal } = await supabase
      .from('referral_signups')
      .select('id', { count: 'exact', head: true })
      .eq('signup_ip_hash', ipHash)
      .gte('registered_at', since24h);

    if ((ipGlobal ?? 0) >= 8) {
      flags.push({
        flag_type: 'ip_global_abuse',
        detail: { count_24h: ipGlobal },
      });
    }
  }

  const deviceHash = await hashWithSalt(input.deviceFp);
  if (deviceHash) {
    const { data: deviceHits } = await supabase
      .from('referral_device_registry')
      .select('supabase_user_id')
      .eq('device_fp_hash', deviceHash)
      .neq('supabase_user_id', input.supabaseUserId)
      .limit(5);

    if (deviceHits && deviceHits.length > 0) {
      flags.push({
        flag_type: 'device_fp_reuse',
        detail: {
          other_accounts: deviceHits.length,
          user_ids: deviceHits.map((r) => r.supabase_user_id),
        },
      });
    }

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: deviceVelocity } = await supabase
      .from('referral_signups')
      .select('id', { count: 'exact', head: true })
      .eq('device_fp_hash', deviceHash)
      .gte('registered_at', since7d);

    if ((deviceVelocity ?? 0) >= 2) {
      flags.push({
        flag_type: 'device_velocity',
        detail: { signups_7d: deviceVelocity },
      });
    }
  }

  if (input.oauthProvider && input.oauthSubject) {
    const subjectHash = await hashWithSalt(
      `${input.oauthProvider}:${input.oauthSubject}`,
    );
    const { data: oauthHit } = await supabase
      .from('referral_oauth_registry')
      .select('supabase_user_id')
      .eq('oauth_provider', input.oauthProvider)
      .eq('oauth_subject_hash', subjectHash)
      .neq('supabase_user_id', input.supabaseUserId)
      .maybeSingle();

    if (oauthHit) {
      flags.push({
        flag_type: 'oauth_subject_reuse',
        detail: { provider: input.oauthProvider },
      });
    }
  }

  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: codeVelocity } = await supabase
    .from('referral_signups')
    .select('id', { count: 'exact', head: true })
    .eq('code_id', codeRow.id)
    .gte('registered_at', since1h);

  if ((codeVelocity ?? 0) >= 6) {
    flags.push({
      flag_type: 'velocity_code',
      detail: { signups_1h: codeVelocity },
    });
  }

  const criticalTypes = new Set([
    'honeypot',
    'existing_email',
    'duplicate_user',
    'disposable_email',
    'device_fp_reuse',
    'oauth_subject_reuse',
    'ip_cluster',
    'ip_global_abuse',
    'device_velocity',
    'velocity_code',
  ]);

  const blocking = flags.filter((f) => criticalTypes.has(f.flag_type));
  const rejected = blocking.length > 0;
  const rejection_reason = rejected
    ? blocking.map((f) => f.flag_type).join(', ')
    : null;

  return { flags, rejected, rejection_reason };
}

export async function createFraudAlert(
  supabase: SupabaseClient,
  params: {
    signupId: string | null;
    partnerId: string;
    codeId: string;
    refCode: string;
    partnerDisplayName: string;
    flags: FraudFlag[];
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  const flagTypes = params.flags.map((f) => f.flag_type);
  const title = `Referido rechazado · ${params.partnerDisplayName}`;
  const message =
    `Código ${params.refCode}: intento de registro bloqueado (${flagTypes.join(', ')}). No cuenta en métricas.`;

  await supabase.from('referral_fraud_alerts').insert({
    signup_id: params.signupId,
    partner_id: params.partnerId,
    code_id: params.codeId,
    ref_code: params.refCode,
    partner_display_name: params.partnerDisplayName,
    severity: flagTypes.includes('honeypot') ? 'critical' : 'high',
    title,
    message,
    flag_types: flagTypes,
    metadata: params.metadata,
  });

  const adminMysqlIds = (Deno.env.get('REFERRAL_ADMIN_MYSQL_IDS') ?? '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (adminMysqlIds.length > 0) {
    const rows = adminMysqlIds.map((user_id_mysql) => ({
      user_id_mysql,
      title,
      message,
      type: 'warning' as const,
    }));
    await supabase.from('arcusx_notifications').insert(rows);
  }
}
