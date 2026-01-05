import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaArrowLeft, FaGoogle, FaGithub, FaGem, FaGlobe } from 'react-icons/fa';
import '../css/Register.css';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

const Register = () => {
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
        setError('Las contraseñas no coinciden');
        return;
      }

      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
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
      setError(error.response?.data?.message || 'Error al registrar usuario');
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
      setError('Error al iniciar sesión con Google: ' + (error.message || 'Error desconocido'));
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
      setError('Error al iniciar sesión con GitHub: ' + (error.message || 'Error desconocido'));
      setOauthLoading(null);
    }
  };

  return (
    <div className="register-container">
      <Link to="/" className="back-button">
        <FaArrowLeft />
        <span>Volver</span>
      </Link>

      <div className="register-content">
        <div className="register-left">
          <div className="register-info">
            <h1>
              Únete a <span className="highlight-text">ArcusX</span>
            </h1>
            <p>Comienza tu viaje en el mundo Web3</p>
            <div className="register-benefits">
              <div className="benefit-item">
                <span className="benefit-icon"></span>
                <span>Accede a microtareas</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon"><FaGem /></span>
                <span>Gana en crypto</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon"><FaGlobe /></span>
                <span>Conecta globalmente</span>
              </div>
            </div>
          </div>
        </div>
        <div className="register-right">
          <form onSubmit={handleSubmit} className="register-form">
            <h2>Crear Cuenta</h2>
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
                  <span>Cargando...</span>
                ) : (
                  <>
                    <FaGoogle />
                    <span>Continuar con Google</span>
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
                  <span>Cargando...</span>
                ) : (
                  <>
                    <FaGithub />
                    <span>Continuar con GitHub</span>
                  </>
                )}
              </button>
            </div>

            {/* Separador */}
            <div className="oauth-divider">
              <span>O regístrate con email</span>
            </div>
            <div className="form-group">
              <input
                type="text"
                name="username"
                placeholder="Nombre de usuario"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Contraseña"
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
            <div className="form-group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirmar contraseña"
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
            
            <button type="submit" className="register-button" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
            <p className="login-link">
              ¿Ya tienes una cuenta? <Link to="/login">Iniciar Sesión</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register; 