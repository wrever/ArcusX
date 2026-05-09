import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaGoogle, FaGithub } from 'react-icons/fa';
import '../css/Login.css';
import '../css/Login.enterprise.css';
import { useAuth } from '../hooks/useAuth';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import { authService } from '../services/authService';
import { useI18n } from '../i18n/I18nProvider';
import SEO from './SEO';

const Login = () => {
  const enterprise = useEnterpriseMode();
  const { t, lang } = useI18n();
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { isAuthenticated } = useAuth();

  // Verificar si el usuario ya está autenticado al cargar el componente
  useEffect(() => {
    if (isAuthenticated) {
      const path = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
      navigate(path, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  const handleGoogleLogin = async () => {
    setError('');
    setOauthLoading('google');
    try {
      await authService.signInWithGoogle();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      setError(t('login.error.google') + ' ' + (msg || t('login.error.unknown')));
      setOauthLoading(null);
    }
  };

  const handleGitHubLogin = async () => {
    setError('');
    setOauthLoading('github');
    try {
      await authService.signInWithGitHub();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      setError(t('login.error.github') + ' ' + (msg || t('login.error.unknown')));
      setOauthLoading(null);
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (isAuthenticated === null) {
    return (
      <div className={`login-container${enterprise ? ' login-container--enterprise' : ''}`}>
        {enterprise && (
          <Link to="/" className="back-button">
            <FaArrowLeft />
            <span>{t('login.back')}</span>
          </Link>
        )}
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">ArcusX</div>
            <h2>{t('login.verifying')}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={t('login.seo.title')}
        description={t('login.seo.description')}
        url="/login"
        locale={lang}
      />
      <div className={`login-container${enterprise ? ' login-container--enterprise' : ''}`}>
        <Link to="/" className="back-button">
          <FaArrowLeft />
          <span>{t('login.back')}</span>
        </Link>

        <div className="login-card">
          <div className="login-header">
            <Link to="/" className="login-logo">
              ArcusX
            </Link>
            <h2>{enterprise ? t('empresa.login.title') : t('login.title')}</h2>
            <p>{enterprise ? t('empresa.login.desc') : t('login.desc')}</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <div className="oauth-buttons">
            <button
              type="button"
              className="oauth-button oauth-google"
              onClick={handleGoogleLogin}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === 'google' ? (
                <span>{t('login.loading')}</span>
              ) : (
                <>
                  <FaGoogle />
                  <span>{t('login.oauth.google')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="oauth-button oauth-github"
              onClick={handleGitHubLogin}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === 'github' ? (
                <span>{t('login.loading')}</span>
              ) : (
                <>
                  <FaGithub />
                  <span>{t('login.oauth.github')}</span>
                </>
              )}
            </button>
          </div>

          <p className="login-oauth-note">{t('login.oauth.note')}</p>

          {!enterprise ? (
            <div className="login-footer">
              <p>
                {t('login.no.account')}{' '}
                <Link to="/register" className="register-link">
                  {t('login.register.link')}
                </Link>
              </p>
            </div>
          ) : (
            <p className="login-footer login-footer--enterprise-note">{t('empresa.login.footer')}</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Login;
