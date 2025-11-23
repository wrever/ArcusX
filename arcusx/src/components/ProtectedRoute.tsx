import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
// import { verifyHumanIdViaBackend } from '../services/humanIdService'; // COMENTADO - HUMAN ID

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  // const [checkingHumanId, setCheckingHumanId] = useState(false); // COMENTADO - HUMAN ID

  // Si el usuario cierra sesión, redirigir inmediatamente
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Verificar Human ID para rutas protegidas (excepto /verify-identity) - COMENTADO
  /*
  useEffect(() => {
    const checkHumanIdVerification = async () => {
      // No verificar Human ID si estamos en la página de verificación
      if (location.pathname === '/verify-identity') {
        return;
      }

      // Solo verificar si el usuario está autenticado y tenemos su ID
      if (!loading && isAuthenticated && user?.id) {
        setCheckingHumanId(true);
        try {
          const isVerified = await verifyHumanIdViaBackend(user.id);
          if (!isVerified) {
            // Si no está verificado, redirigir a verificación
            navigate('/verify-identity', { replace: true });
          }
        } catch (error) {
          // Si hay error, permitir acceso (no bloquear)
        } finally {
          setCheckingHumanId(false);
        }
      }
    };

    checkHumanIdVerification();
  }, [isAuthenticated, loading, user, location.pathname, navigate]);
  */

  // Mostrar loading mientras se verifica la autenticación o Human ID
  if (loading) { // Removido checkingHumanId
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #07233c 0%, #0a2d4a 100%)'
      }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          padding: '2rem', 
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3>Verificando autenticación...</h3>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado, mostrar el contenido protegido
  return <>{children}</>;
};

export default ProtectedRoute; 