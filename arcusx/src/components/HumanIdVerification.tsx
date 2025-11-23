import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaUserCheck, FaSpinner, FaRedo } from 'react-icons/fa';
import { verifyHumanId, requestHumanIdVerificationWithActionId, verifyHumanIdViaBackend, generateNewActionId } from '../services/humanIdService';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';

interface HumanIdVerificationProps {
  userId?: number;
  onVerificationChange?: (verified: boolean) => void;
  showLabel?: boolean;
  compact?: boolean;
}

export const HumanIdVerification: React.FC<HumanIdVerificationProps> = ({
  userId,
  onVerificationChange,
  showLabel = true,
  compact = false,
}) => {
  const { address } = useWallet();
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [actionId, setActionId] = useState<string | undefined>(undefined);
  const [isGeneratingNewActionId, setIsGeneratingNewActionId] = useState(false);

  // Verificar estado al cargar el componente - solo una vez
  useEffect(() => {
    // Usar userId del usuario autenticado si está disponible
    const effectiveUserId = userId || (user && typeof user === 'object' && 'id' in user ? user.id : null);
    if (effectiveUserId || address) {
      checkVerificationStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.id, address]); // Solo dependemos de los valores primitivos, no de objetos completos

  const checkVerificationStatus = async () => {
    const effectiveUserId = userId || (user && typeof user === 'object' && 'id' in user ? user.id : null);
    if (!address && !effectiveUserId) return;

    setIsChecking(true);
    try {
      let verified = false;
      let currentActionId: string | undefined = undefined;

      // Si tenemos userId, verificar vía backend (más confiable)
      if (effectiveUserId) {
        const result = await verifyHumanIdViaBackend(effectiveUserId);
        verified = result.verified;
        currentActionId = result.actionId;
        setActionId(currentActionId);
      } 
      // Si solo tenemos address, verificar directamente con API
      else if (address) {
        verified = await verifyHumanId(address);
      }

      setIsVerified(verified);
      onVerificationChange?.(verified);
    } catch (error) {
      setIsVerified(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // Si no tenemos action_id, obtenerlo primero
      let currentActionId = actionId;
      if (!currentActionId) {
        const effectiveUserId = userId || (user && typeof user === 'object' && 'id' in user ? user.id : null);
        if (effectiveUserId) {
          const result = await verifyHumanIdViaBackend(effectiveUserId);
          currentActionId = result.actionId;
          setActionId(currentActionId);
        }
      }
      
      // Si aún no tenemos action_id, generar uno nuevo automáticamente
      if (!currentActionId) {
        try {
          const newActionId = await generateNewActionId();
          currentActionId = newActionId;
          setActionId(newActionId);
        } catch (error) {
          console.error('Error generando action_id:', error);
          alert('Error al generar action_id. Por favor, intenta usar el botón "Obtener más intentos" primero.');
          setIsVerifying(false);
          return;
        }
      }
      
      // Usar 'phone' en lugar de 'gov-id' para verificación gratuita
      requestHumanIdVerificationWithActionId('phone', currentActionId);
    } catch (error) {
      console.error('Error en handleVerify:', error);
      setIsVerifying(false);
    }
  };

  const handleGenerateNewActionId = async () => {
    setIsGeneratingNewActionId(true);
    try {
      const newActionId = await generateNewActionId();
      setActionId(newActionId);
      // Recargar el estado de verificación después de generar nuevo action_id
      await checkVerificationStatus();
      alert('¡Nuevo action_id generado exitosamente! Ahora tienes 3 intentos más disponibles. Haz clic en "Verificar con Human ID" para intentar nuevamente.');
    } catch (error: any) {
      console.error('Error generando nuevo action_id:', error);
      alert('Error al generar nuevo action_id: ' + (error.message || 'Por favor, intenta nuevamente.'));
    } finally {
      setIsGeneratingNewActionId(false);
    }
  };

  if (isChecking) {
    return (
      <div className={`human-id-verification ${compact ? 'compact' : ''}`}>
        <FaSpinner className="spinner" />
        {!compact && <span>Verificando...</span>}
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className={`human-id-verification verified ${compact ? 'compact' : ''}`}>
        <FaCheckCircle className="verified-icon" />
        {showLabel && <span>Verified Human</span>}
      </div>
    );
  }

  return (
    <div className={`human-id-verification ${compact ? 'compact' : ''}`}>
      <button
        onClick={handleVerify}
        disabled={isVerifying}
        className="verify-button"
      >
        {isVerifying ? (
          <>
            <FaSpinner className="spinner" />
            <span>Redirigiendo...</span>
          </>
        ) : (
          <>
            <FaUserCheck />
            <span>Verificar con Human ID</span>
          </>
        )}
      </button>
      
      {/* Botón para obtener más intentos - siempre visible */}
      <button
        onClick={handleGenerateNewActionId}
        disabled={isGeneratingNewActionId || isVerifying}
        className="reset-attempts-button"
        style={{
          marginTop: compact ? '5px' : '10px',
          padding: compact ? '6px 12px' : '8px 16px',
          fontSize: compact ? '0.8rem' : '0.9rem',
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: '#ffffff',
          borderRadius: '8px',
          cursor: isGeneratingNewActionId || isVerifying ? 'not-allowed' : 'pointer',
          opacity: isGeneratingNewActionId || isVerifying ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap'
        }}
        title="Genera un nuevo action-id para obtener 3 intentos más de verificación"
      >
        {isGeneratingNewActionId ? (
          <>
            <FaSpinner className="spinner" />
            <span>{compact ? 'Generando...' : 'Generando...'}</span>
          </>
        ) : (
          <>
            <FaRedo />
            <span>{compact ? 'Más intentos' : 'Obtener más intentos (3 nuevos)'}</span>
          </>
        )}
      </button>
      
      {showLabel && !compact && (
        <p className="verify-hint" style={{ marginTop: '10px', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          Verifica tu identidad para demostrar que eres un humano único. Si agotas tus 3 intentos, puedes obtener 3 más haciendo clic en el botón de arriba.
        </p>
      )}
    </div>
  );
};
