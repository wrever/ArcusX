import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { supabase } from '../config/supabase';
// import { verifyHumanIdViaBackend } from '../services/humanIdService'; // COMENTADO - HUMAN ID
import '../css/Login.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // SIEMPRE redirigir a arcusx.one si estamos en localhost
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const error = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          
          // Construir nueva URL con todos los parámetros
          const newUrl = new URL('https://arcusx.one/auth/callback');
          if (code) newUrl.searchParams.set('code', code);
          if (error) newUrl.searchParams.set('error', error);
          if (errorDescription) newUrl.searchParams.set('error_description', errorDescription);
          
          // Redirigir inmediatamente
          window.location.replace(newUrl.toString());
          return;
        }
        
        // Supabase procesa automáticamente los parámetros de la URL
        // Esperamos un momento para que Supabase procese la sesión
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Obtener la sesión de Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!session?.user) {
          setError('No se pudo obtener la sesión de autenticación');
          setLoading(false);
          return;
        }

        // Sincronizar usuario con backend PHP para obtener token JWT
        const result = await authService.handleSupabaseCallback();
        
        // COMENTADO - HUMAN ID
        // if (result && result.user?.id) {
        //   // Verificar si el usuario tiene Human ID verificado
        //   const isHumanIdVerified = await verifyHumanIdViaBackend(result.user.id);
        //   
        //   // Si no está verificado, redirigir a verificación de identidad
        //   if (!isHumanIdVerified) {
        //     navigate('/verify-identity', { replace: true });
        //   } else {
        //     // Si está verificado, redirigir al dashboard
        //     navigate('/dashboard', { replace: true });
        //   }
        // } else {
        //   setError('No se pudo completar la autenticación');
        //   setLoading(false);
        // }
        
        if (result && result.user?.id) {
          // Redirigir directamente al dashboard (sin verificación Human ID)
          navigate('/dashboard', { replace: true });
        } else {
          setError('No se pudo completar la autenticación');
          setLoading(false);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Error al procesar la autenticación');
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">ArcusX</div>
            <h2>Completando autenticación...</h2>
            <p>Por favor espera</p>
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
            <h2>Error de autenticación</h2>
            <div className="login-error">{error}</div>
            <button 
              className="login-button" 
              onClick={() => navigate('/login')}
              style={{ marginTop: '1rem' }}
            >
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;

