import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaLock, FaUser, FaEye, FaEyeSlash, FaShieldAlt, FaArrowLeft, FaKey } from 'react-icons/fa';
import { adminLogin } from '../services/adminService';
import '../css/Login.css';
import '../css/AdminLogin.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, completa todos los campos');
      setLoading(false);
      return;
    }

    try {
      const response = await adminLogin(email, password);

      if (response.success && response.token) {
        // Redirigir al panel de administración
        navigate('/admin/dashboard');
      } else {
        setError(response.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-background">
        <div className="admin-login-pattern"></div>
      </div>

      <Link to="/login" className="admin-back-button">
        <FaArrowLeft />
        <span>Volver al login</span>
      </Link>

      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-badge-wrapper">
            <div className="admin-badge-glow"></div>
            <div className="admin-badge">
              <FaShieldAlt />
            </div>
          </div>
          <h1 className="admin-title">
            Panel de <span className="admin-title-highlight">Administración</span>
          </h1>
          <p className="admin-subtitle">Acceso exclusivo para administradores autorizados</p>
          <div className="admin-divider"></div>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="admin-error-message">
              <FaShieldAlt />
              <span>{error}</span>
            </div>
          )}

          <div className="admin-form-group">
            <label htmlFor="admin-email" className="admin-label">
              <FaUser className="admin-label-icon" />
              <span>Email de Administrador</span>
            </label>
            <div className="admin-input-wrapper">
              <input
                type="email"
                id="admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@arcusx.pro"
                required
                disabled={loading}
                className="admin-input"
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label htmlFor="admin-password" className="admin-label">
              <FaLock className="admin-label-icon" />
              <span>Contraseña</span>
            </label>
            <div className="admin-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={loading}
                className="admin-input"
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-submit-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="admin-spinner"></div>
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <FaKey />
                <span>Acceder al Panel</span>
              </>
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <div className="admin-security-note">
            <FaShieldAlt />
            <span>Conexión segura y encriptada</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

