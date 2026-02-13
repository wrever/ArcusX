import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { supabase } from '../config/supabase';
import { useI18n } from '../i18n/I18nProvider';
import '../css/Login.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          try {
            // Sincronizar usuario con backend PHP para obtener token JWT
            const result = await authService.handleSupabaseCallback();
            
            if (result && result.user?.id) {
              // Esperar un momento para asegurar que el token esté guardado
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Verificar que el token esté realmente guardado
              const token = localStorage.getItem('token');
              if (!token) {
                setError(t('auth.callback.error.saveSession'));
                setLoading(false);
                return;
              }
              
              // Usar window.location para forzar recarga completa y asegurar que ProtectedRoute vea el token
              window.location.href = '/dashboard';
            } else {
              setError(t('auth.callback.error.auth'));
              setLoading(false);
            }
          } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || t('auth.callback.error.process');
            setError(errorMessage);
            setLoading(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setError(t('auth.callback.error.signedOut'));
        setLoading(false);
      }
    });

    // También intentar obtener la sesión actual inmediatamente
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // No lanzar error aquí, esperar a onAuthStateChange
          return;
        }
        
        if (session?.user) {
          // Sincronizar usuario con backend PHP para obtener token JWT
          const result = await authService.handleSupabaseCallback();
          
          if (result && result.user?.id) {
            // Esperar un momento para asegurar que el token esté guardado
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Verificar que el token esté realmente guardado
            const token = localStorage.getItem('token');
            if (!token) {
              setError(t('auth.callback.error.saveSession'));
              setLoading(false);
              return;
            }
            
            // Usar window.location para forzar recarga completa y asegurar que ProtectedRoute vea el token
            window.location.href = '/dashboard';
          } else {
            setError(t('auth.callback.error.auth'));
            setLoading(false);
          }
        } else {
          // Esperar a que Supabase procese la URL
          setTimeout(() => {
            if (loading) {
              checkSession();
            }
          }, 2000);
        }
      } catch (err: any) {
        // No establecer error aquí, esperar a onAuthStateChange
      }
    };

    checkSession();

    // Limpiar suscripción al desmontar
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, loading]);

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

