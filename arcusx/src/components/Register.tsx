import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaGoogle, FaGithub, FaGem, FaGlobe, FaTasks } from 'react-icons/fa';
import '../css/Register.css';
import '../css/Register.enterprise.css';
import { authService } from '../services/authService';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/I18nProvider';
import SEO from './SEO';

const Register = () => {
  const enterprise = useEnterpriseMode();
  const { t, lang } = useI18n();
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = async () => {
    setError('');
    setOauthLoading('google');
    try {
      await authService.signInWithGoogle();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      setError(t('register.error.google') + ' ' + (msg || t('register.error.unknown')));
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
      setError(t('register.error.github') + ' ' + (msg || t('register.error.unknown')));
      setOauthLoading(null);
    }
  };

  return (
    <>
      <SEO
        title={t('register.seo.title')}
        description={t('register.seo.description')}
        url="/register"
        locale={lang}
      />
      <div className={`register-container${enterprise ? ' register-container--enterprise' : ''}`}>
        <Link to="/" className="back-button">
          <FaArrowLeft />
          <span>{t('register.back')}</span>
        </Link>

        <div className="register-content">
          <div className="register-left">
            <div className="register-info">
              <h1>
                {t('register.join')} <span className="highlight-text">{t('register.join.highlight')}</span>
              </h1>
              <p>{t('register.subtitle')}</p>
              <div className="register-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">
                    <FaTasks />
                  </span>
                  <span>{t('register.benefit.microtasks')}</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">
                    <FaGem />
                  </span>
                  <span>{t('register.benefit.crypto')}</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">
                    <FaGlobe />
                  </span>
                  <span>{t('register.benefit.global')}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="register-right">
            <div className="register-form">
              <h2>{t('register.title')}</h2>
              {error && <div className="register-error">{error}</div>}

              <div className="oauth-buttons">
                <button
                  type="button"
                  className="oauth-button oauth-google"
                  onClick={handleGoogleLogin}
                  disabled={oauthLoading !== null}
                >
                  {oauthLoading === 'google' ? (
                    <span>{t('register.loading')}</span>
                  ) : (
                    <>
                      <FaGoogle />
                      <span>{t('register.oauth.google')}</span>
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
                    <span>{t('register.loading')}</span>
                  ) : (
                    <>
                      <FaGithub />
                      <span>{t('register.oauth.github')}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="register-oauth-note">{t('register.oauth.note')}</p>

              <p className="login-link">
                {t('register.has.account')} <Link to="/login">{t('register.login.link')}</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
