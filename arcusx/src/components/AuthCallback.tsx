import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { supabase, hasSupabase } from '../config/supabase';
import { useI18n } from '../i18n/I18nProvider';
import '../css/Login.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const retryCount = useRef(0);
  const maxRetries = 2;

  useEffect(() => {
    if (!hasSupabase) {
      setError(t('auth.callback.error.auth'));
      setLoading(false);
      return;
    }

    const processSession = async (session: { user: unknown } | null) => {
      if (!session?.user) return false;
      try {
        const result = await authService.handleSupabaseCallback();
        if (result && result.user?.id) {
          await new Promise(resolve => setTimeout(resolve, 300));
          if (!localStorage.getItem('token')) {
            setError(t('auth.callback.error.saveSession'));
            setLoading(false);
            return true;
          }
          window.location.href = '/dashboard';
          return true;
        }
        setError(t('auth.callback.error.auth'));
        setLoading(false);
        return true;
      } catch (err: unknown) {
        const msg = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error ? err.message : t('auth.callback.error.process');
        setError(String(msg));
        setLoading(false);
        return true;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) await processSession(session);
      } else if (event === 'SIGNED_OUT') {
        setError(t('auth.callback.error.signedOut'));
        setLoading(false);
      }
    });

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) return;
        if (session?.user) {
          await processSession(session);
          return;
        }
        retryCount.current += 1;
        if (retryCount.current <= maxRetries) {
          setTimeout(checkSession, 1500);
        } else {
          setLoading(false);
          setError(t('auth.callback.error.noSession'));
        }
      } catch {
        retryCount.current += 1;
        if (retryCount.current > maxRetries) {
          setLoading(false);
          setError(t('auth.callback.error.process'));
        }
      }
    };

    checkSession();
    return () => subscription.unsubscribe();
  }, [t]);

  if (loading) {
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
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">ArcusX</div>
            <h2>{t('auth.callback.errorTitle')}</h2>
            <div className="login-error">{error}</div>
            <button 
              className="login-button" 
              onClick={() => navigate('/login')}
              style={{ marginTop: '1rem' }}
            >
              {t('auth.callback.backToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mantener el componente montado mientras procesa
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
};

export default AuthCallback;

