import { hasSupabase, supabase } from '../config/supabase';
import {
  getOrCreateDeviceFingerprint,
  normalizeRefCode,
} from '../utils/referralCapture';

export async function bindReferralPending(refCode: string): Promise<void> {
  const normalized = normalizeRefCode(refCode);
  if (!normalized || !hasSupabase) return;

  const deviceFp = getOrCreateDeviceFingerprint();
  await supabase.functions
    .invoke('referral-bind-pending', {
      body: { ref_code: normalized, device_fp: deviceFp },
    })
    .catch(() => undefined);
}
