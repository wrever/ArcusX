import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, hasSupabase } from '../config/supabase';
import {
  storeRefCode,
  normalizeRefCode,
  hardRedirectToLoginWithRef,
  getOrCreateDeviceFingerprint,
} from '../utils/referralCapture';
import { bindReferralPending } from '../services/referralBindService';
import '../css/Login.css';

const RESOLVE_TIMEOUT_MS = 4000;

function trackVisitAsync(code: string): void {
  if (!hasSupabase) return;
  const deviceFp = getOrCreateDeviceFingerprint();
  const invoke = supabase.functions.invoke('referral-resolve-code', {
    body: { code, device_fp: deviceFp, track_visit: true },
  });
  const timeout = new Promise<{ data: null; error: Error }>((resolve) => {
    setTimeout(() => resolve({ data: null, error: new Error('timeout') }), RESOLVE_TIMEOUT_MS);
  });
  void Promise.race([invoke, timeout]).then(({ data, error }) => {
    if (!error && data?.valid === false) {
      try {
        sessionStorage.setItem('arcusx_ref_invalid', code);
      } catch {
        /* ignore */
      }
    }
  });
}

const ReferralLanding = () => {
  const { code } = useParams<{ code: string }>();
  const [status, setStatus] = useState<'loading' | 'invalid'>('loading');

  useEffect(() => {
    const normalized = normalizeRefCode(code ?? '');
    if (!normalized) {
      setStatus('invalid');
      return;
    }

    storeRefCode(normalized);
    trackVisitAsync(normalized);
    void bindReferralPending(normalized);

    // Safari iOS: redirect inmediato (bind en paralelo; pending + cookie HttpOnly en servidor)
    hardRedirectToLoginWithRef(normalized);
  }, [code]);

  if (status === 'invalid') {
    return (
      <div className="login-container" style={{ maxWidth: 480, margin: '3rem auto', padding: '2rem' }}>
        <h1>Enlace no válido</h1>
        <p>Este código de invitación no existe o expiró.</p>
      </div>
    );
  }

  return (
    <div className="login-container" style={{ padding: '4rem', textAlign: 'center' }}>
      <p>Redirigiendo al registro…</p>
    </div>
  );
};

export default ReferralLanding;
