import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaGoogle, FaGithub } from 'react-icons/fa';
import '../css/Login.css';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
// import { verifyHumanIdViaBackend } from '../services/humanIdService'; // COMENTADO - HUMAN ID

const Login = () => {
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
        setError('Por favor, completa todos los campos');
        return;
      }

      await login(email, password);
      
      // COMENTADO - HUMAN ID
      // if (user?.id) {
      //   // Verificar si el usuario tiene Human ID verificado
      //   const isHumanIdVerified = await verifyHumanIdViaBackend(user.id);
      //   
      //   // Si no está verificado, redirigir a verificación de identidad
      //   if (!isHumanIdVerified) {
      //     navigate('/verify-identity', { replace: true });
      //   } else {
      //     // Si está verificado, redirigir al dashboard
      //     navigate('/dashboard', { replace: true });
      //   }
      // } else {
      //   // Si no hay usuario, redirigir al dashboard (fallback)
      //   navigate('/dashboard', { replace: true });
      // }
      
      // Redirigir directamente al dashboard (sin verificación Human ID)
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error al iniciar sesión');
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

  // Mostrar loading mientras se verifica la autenticación
  if (isAuthenticated === null) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">ArcusX</div>
            <h2>Verificando sesión...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <Link to="/" className="back-button">
        <FaArrowLeft />
        <span>Volver</span>
      </Link>
      
      <div className="login-card">
        <div className="login-header">
          <Link to="/" className="login-logo">
            ArcusX
          </Link>
          <h2>Iniciar Sesión</h2>
          <p>Accede a tu cuenta para comenzar a ganar</p>
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
            disabled={oauthLoading !== null}
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
          <span>O inicia sesión con email</span>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email"> <h4> Correo Electrónico </h4> </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password"> <h4> Contraseña </h4> </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-options">
            <div className="remember-me">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Recordarme</label>
            </div>
            <Link to="/forgot-password" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="register-link">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 