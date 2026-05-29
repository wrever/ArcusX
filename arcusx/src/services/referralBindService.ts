import axios from 'axios';
import { API_URL } from '../config/database';
import { supabase, hasSupabase } from '../config/supabase';
import {
  getOrCreateDeviceFingerprint,
  normalizeRefCode,
} from '../utils/referralCapture';

/**
 * Rastro en servidor (paralelo a OAuth): Edge pending + cookie HttpOnly vía PHP.
 * Fire-and-forget; no bloquea redirect a login.
 */
export async function bindReferralPending(refCode: string): Promise<void> {
  const normalized = normalizeRefCode(refCode);
  if (!normalized) return;

  const deviceFp = getOrCreateDeviceFingerprint();
  const tasks: Promise<unknown>[] = [];

  if (hasSupabase) {
    tasks.push(
      supabase.functions
        .invoke('referral-bind-pending', {
          body: { ref_code: normalized, device_fp: deviceFp },
        })
        .then(() => undefined)
        .catch(() => undefined),
    );
  }

  tasks.push(
    axios
      .post(
        `${API_URL}/referral_bind.php`,
        { ref_code: normalized, device_fp: deviceFp },
        { timeout: 8000, withCredentials: true },
      )
      .then(() => undefined)
      .catch(() => undefined),
  );

  await Promise.allSettled(tasks);
}
