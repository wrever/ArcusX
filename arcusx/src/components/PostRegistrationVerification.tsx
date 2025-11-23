import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaLock, FaUserCheck, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import { HumanIdVerification } from './HumanIdVerification';
import { useAuth } from '../hooks/useAuth';
import { verifyHumanIdViaBackend } from '../services/humanIdService';
import '../css/PostRegistrationVerification.css';

const PostRegistrationVerification = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Solo verificar una vez cuando el componente se monta o cuando user.id cambia
    if (user?.id) {
      checkVerificationStatus();
    } else {
      setIsChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Solo dependemos de user.id, no de todo el objeto user

  const checkVerificationStatus = async () => {
    if (!user?.id) {
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    try {
      const result = await verifyHumanIdViaBackend(user.id);
      setIsVerified(result.verified);
    } catch (error: any) {
      // Si el error es porque no tiene wallet, no es un error crítico
      if (error?.message?.includes('wallet')) {
        setIsVerified(false);
      } else {
        setIsVerified(false);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (isChecking) {
    return (
      <div className="post-reg-verification-container">
        <div className="post-reg-verification-card">
          <div className="loading-spinner">
            <FaUserCheck className="spinner-icon" />
          </div>
          <h2>Verificando estado...</h2>
        </div>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="post-reg-verification-container">
        <div className="post-reg-verification-card verified">
          <div className="success-icon">
            <FaCheckCircle />
          </div>
          <h2>¡Verificación Completada!</h2>
          <p>Tu identidad ha sido verificada con Human ID. Ya puedes usar todas las funciones de ArcusX.</p>
          <button className="primary-button" onClick={handleGoToDashboard}>
            Ir al Dashboard
            <FaArrowRight />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-reg-verification-container">
      <div className="post-reg-verification-card">
        <div className="verification-header">
          <div className="header-icon">
            <FaShieldAlt />
          </div>
          <h1>Verifica tu Identidad</h1>
          <p className="subtitle">Protege tu cuenta y desbloquea todas las funciones</p>
        </div>

        <div className="verification-benefits">
          <div className="benefit-item">
            <div className="benefit-icon">
              <FaLock />
            </div>
            <div className="benefit-content">
              <h3>Privacidad Total</h3>
              <p>Usamos Zero-Knowledge Proofs. Nunca almacenamos tu información personal.</p>
            </div>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">
              <FaUserCheck />
            </div>
            <div className="benefit-content">
              <h3>Anti-Bots</h3>
              <p>Demuestra que eres un humano único y reduce el fraude en la plataforma.</p>
            </div>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">
              <FaShieldAlt />
            </div>
            <div className="benefit-content">
              <h3>Acceso Completo</h3>
              <p>Desbloquea todas las funciones: crear tareas, recibir pagos, y más.</p>
            </div>
          </div>
        </div>

        <div className="verification-section">
          <h3>¿Cómo funciona?</h3>
          <ol className="verification-steps">
            <li>Haz clic en "Verificar con Human ID"</li>
            <li>Serás redirigido a Human ID (verificación segura)</li>
            <li>Completa la verificación (2-3 minutos)</li>
            <li>¡Listo! Tu identidad estará verificada</li>
          </ol>
        </div>

        <div className="verification-action">
          <div className="verification-note">
            <p><strong>Nota importante:</strong> La verificación es <strong>100% gratuita</strong> mediante teléfono. Para verificar tu identidad con Human ID, necesitas tener una wallet Stellar conectada. Si aún no tienes una, puedes conectarla desde el Dashboard y luego volver aquí para verificar.</p>
            <p style={{ marginTop: '10px', fontSize: '0.9rem' }}><strong>💡 Tip:</strong> Si agotas tus 3 intentos de verificación, puedes obtener 3 intentos más usando el botón "Obtener más intentos" que aparece debajo del botón de verificación.</p>
          </div>
          <HumanIdVerification 
            userId={user?.id}
            showLabel={false}
            compact={false}
            onVerificationChange={(verified) => {
              if (verified) {
                setIsVerified(true);
              }
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default PostRegistrationVerification;

