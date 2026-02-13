import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaArrowLeft, FaGoogle, FaGithub, FaGem, FaGlobe, FaTasks } from 'react-icons/fa';
import '../css/Register.css';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/I18nProvider';
import SEO from './SEO';

const Register = () => {
  const { t, lang } = useI18n();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Verificar si el usuario ya está autenticado al cargar el componente
  useEffect(() => {
    if (isAuthenticated) {
      // Si ya está autenticado, redirigir al dashboard
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validaciones
      if (formData.password !== formData.confirmPassword) {
        setError(t('register.error.password.match'));
        return;
      }

      if (formData.password.length < 6) {
        setError(t('register.error.password.length'));
        return;
      }

      // Registrar usuario
      await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      // Redirigir a verificación de identidad después del registro exitoso
      // El usuario deberá hacer login primero, pero guardamos la intención
      navigate('/login?from=register');
    } catch (error: any) {
      setError(error.response?.data?.message || t('register.error'));
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
      setError(t('register.error.google') + ' ' + (error.message || t('register.error.unknown')));
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
      setError(t('register.error.github') + ' ' + (error.message || t('register.error.unknown')));
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
      <div className="register-container">
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
                <span className="benefit-icon"><FaTasks /></span>
                <span>{t('register.benefit.microtasks')}</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon"><FaGem /></span>
                <span>{t('register.benefit.crypto')}</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon"><FaGlobe /></span>
                <span>{t('register.benefit.global')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="register-right">
          <form onSubmit={handleSubmit} className="register-form">
            <h2>{t('register.title')}</h2>
            {error && <div className="register-error">{error}</div>}
            
            {/* Botones OAuth - Movidos arriba */}
            <div className="oauth-buttons">
              <button
                type="button"
                className="oauth-button oauth-google"
                onClick={handleGoogleLogin}
                disabled={oauthLoading !== null || loading}
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
                disabled={oauthLoading !== null || loading}
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

            {/* Separador */}
            <div className="oauth-divider">
              <span>{t('register.oauth.divider')}</span>
            </div>
            <div className="form-group">
              <input
                type="text"
                id="username"
                name="username"
                placeholder={t('register.username.placeholder')}
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                id="email"
                name="email"
                placeholder={t('register.email.placeholder')}
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group password-field">
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder={t('register.password.placeholder')}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <div className="form-group password-field">
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder={t('register.password.confirm.placeholder')}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            
            <button type="submit" className="register-button" disabled={loading}>
              {loading ? t('register.submitting') : t('register.submit')}
            </button>
            <p className="login-link">
              {t('register.has.account')} <Link to="/login">{t('register.login.link')}</Link>
            </p>
          </form>
        </div>
      </div>
      </div>
    </>
  );
};

export default Register; 