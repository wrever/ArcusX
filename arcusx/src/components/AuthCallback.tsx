import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { captureRefFromSearch } from '../utils/referralCapture';
import { supabase, hasSupabase } from '../config/supabase';
import { useI18n } from '../i18n/I18nProvider';
import '../css/Login.css';

const MAX_WAIT_MS = 30000;
const POLL_MS = 400;

/** Quita ?code= de la URL tras el login (evita re-procesar al refrescar). */
function stripOAuthParamsFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    const next = url.pathname + url.search + url.hash;
    window.history.replaceState({}, '', next || '/auth/callback');
  } catch {
    /* ignore */
  }
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const finishedRef = useRef(false);
  const syncingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasSupabase) {
      setError(t('auth.callback.error.auth'));
      setLoading(false);
      return;
    }

    let cancelled = false;

    const goDashboard = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stripOAuthParamsFromUrl();
      window.location.replace('/dashboard');
    };

    const fail = (message: string) => {
      if (finishedRef.current) return;
      if (authService.isAuthenticated()) {
        goDashboard();
        return;
      }
      finishedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setError(message);
      setLoading(false);
    };

    const syncArcusxSession = async (): Promise<boolean> => {
      if (finishedRef.current || syncingRef.current) {
        return finishedRef.current;
      }
      syncingRef.current = true;
      try {
        captureRefFromSearch(window.location.search);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          syncingRef.current = false;
          return false;
        }

        const result = await authService.handleSupabaseCallback();
        if (!result?.user?.id || !localStorage.getItem('token')) {
          syncingRef.current = false;
          return false;
        }

        goDashboard();
        return true;
      } catch (err: unknown) {
        syncingRef.current = false;
        if (authService.isAuthenticated()) {
          goDashboard();
          return true;
        }
        const msg = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error ? err.message : t('auth.callback.error.process');
        fail(String(msg));
        return true;
      }
    };

    timeoutRef.current = setTimeout(() => {
      if (!cancelled) fail(t('auth.callback.error.noSession'));
    }, MAX_WAIT_MS);

    // NO llamar exchangeCodeForSession: detectSessionInUrl en supabase.ts ya intercambia el PKCE.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || finishedRef.current) return;
      if (
        session?.user &&
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')
      ) {
        void syncArcusxSession();
      }
    });

    void (async () => {
      await new Promise((r) => setTimeout(r, 100));
      for (let i = 0; i < Math.ceil(MAX_WAIT_MS / POLL_MS); i++) {
        if (cancelled || finishedRef.current) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const done = await syncArcusxSession();
          if (done) return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [t]);

  if (loading && !error) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">ArcusX</div>
            <h2>{t('auth.callback.completing')}</h2>
            <p>{t('auth.callback.pleaseWait')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    if (authService.isAuthenticated()) {
      window.location.replace('/dashboard');
      return null;
    }
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">ArcusX</div>
            <h2>{t('auth.callback.errorTitle')}</h2>
            <div className="login-error">{error}</div>
            <button
              type="button"
              className="login-button"
              onClick={() => {
                if (authService.isAuthenticated()) {
                  window.location.replace('/dashboard');
                } else if (hasSupabase) {
                  void (async () => {
                    setError(null);
                    setLoading(true);
                    finishedRef.current = false;
                    syncingRef.current = false;
                    const ok = await authService.handleSupabaseCallback();
                    if (ok?.user?.id && localStorage.getItem('token')) {
                      window.location.replace('/dashboard');
                    } else {
                      setLoading(false);
                      setError(t('auth.callback.error.process'));
                    }
                  })();
                } else {
                  navigate('/login');
                }
              }}
              style={{ marginTop: '1rem' }}
            >
              {authService.isAuthenticated()
                ? 'Continuar al panel'
                : t('auth.callback.backToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
