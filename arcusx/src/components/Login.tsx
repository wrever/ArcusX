import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaGoogle, FaGithub, FaEnvelope, FaLock } from 'react-icons/fa';
import '../css/Login.css';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { useI18n } from '../i18n/I18nProvider';
import SEO from './SEO';

const Login = () => {
  const { t, lang } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  // Verificar si el usuario ya está autenticado al cargar el componente
  useEffect(() => {
    if (isAuthenticated) {
      // Si ya está autenticado, redirigir al dashboard
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (!email || !password) {
        setError(t('login.error.empty'));
        return;
      }

      await login(email, password);
      
      // Redirigir directamente al dashboard (sin verificación Human ID)
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setError(error.response?.data?.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setOauthLoading('google');
    try {
      await authService.signInWithGoogle();
      // La redirección se manejará automáticamente
    } catch (error: any) {
      setError(t('login.error.google') + ' ' + (error.message || t('login.error.unknown')));
      setOauthLoading(null);
    }
  };

  const handleGitHubLogin = async () => {
    setError('');
    setOauthLoading('github');
    try {
      await authService.signInWithGitHub();
      // La redirección se manejará automáticamente
    } catch (error: any) {
      setError(t('login.error.github') + ' ' + (error.message || t('login.error.unknown')));
      setOauthLoading(null);
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (isAuthenticated === null) {
    return (
      <div className="login-container">
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
        title="Iniciar Sesión | ArcusX - Trabajos Online en Stellar"
        description="Accede a tu cuenta de ArcusX. Trabajos online, freelancing en Stellar, pagos instantáneos en USDC. Plataforma de trabajos remotos Web3 para LATAM. Arcus, Arcu."
        url="/login"
        locale={lang}
      />
      <div className="login-container">
        <Link to="/" className="back-button">
          <FaArrowLeft />
          <span>{t('login.back')}</span>
        </Link>
        
        <div className="login-card">
        <div className="login-header">
          <Link to="/" className="login-logo">
            ArcusX
          </Link>
          <h2>{t('login.title')}</h2>
          <p>{t('login.desc')}</p>
        </div>
        
        {error && <div className="login-error">{error}</div>}
        
        {/* Botones OAuth - Movidos arriba */}
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

        {/* Separador */}
        <div className="oauth-divider">
          <span>{t('login.oauth.divider')}</span>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">
              <h4>
                <FaEnvelope style={{ marginRight: '6px', fontSize: '14px' }} />
                {t('login.email')}
              </h4>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.email.placeholder')}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              <h4>
                <FaLock style={{ marginRight: '6px', fontSize: '14px' }} />
                {t('login.password')}
              </h4>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.password.placeholder')}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-options">
            <div className="remember-me">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">{t('login.remember')}</label>
            </div>
            <Link to="/forgot-password" className="forgot-password">
              {t('login.forgot')}
            </Link>
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            {t('login.no.account')}{' '}
            <Link to="/register" className="register-link">
              {t('login.register.link')}
            </Link>
          </p>
        </div>
      </div>
      </div>
    </>
  );
};

export default Login; 