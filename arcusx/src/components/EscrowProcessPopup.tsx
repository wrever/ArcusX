import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaWallet, FaFileContract, FaCoins, FaCheckCircle, FaSpinner, FaTimes, FaHome, FaDollarSign } from 'react-icons/fa';
import { usePlatformFee } from '../hooks/usePlatformFee';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  buttonText?: string;
  onAction?: () => void;
}

interface EscrowProcessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  taskPrice: string;
  contributorAddress: string;
  contributorName: string;
  taskId?: string;
  acceptedApplicantId?: number | string;
  onCreateEscrow: () => Promise<{ success: boolean; escrowId?: string; error?: string }>;
  onFundEscrow: (escrowId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  onSelectWorker: (escrowId: string, txHash: string) => Promise<{ success: boolean; error?: string }>;
  onConnectWallet: () => Promise<{ success: boolean; error?: string }>;
}

const EscrowProcessPopup: React.FC<EscrowProcessPopupProps> = ({
  isOpen,
  onClose,
  onComplete,
  taskPrice,
  contributorAddress,
  contributorName,
  taskId,
  acceptedApplicantId,
  onCreateEscrow,
  onFundEscrow,
  onSelectWorker,
  onConnectWallet
}) => {
  const navigate = useNavigate();
  // Obtener platform fee para calcular el total con comisión
  const { platformFee } = usePlatformFee();
  
  // Calcular montos usando la fórmula correcta
  // Trustless Work calcula la comisión sobre el amount del escrow al liberar
  // Para que el trabajador reciba exactamente workerAmount:
  // escrowAmount = workerAmount / (1 - platformFee)
  // commission = escrowAmount - workerAmount
  const workerAmount = parseFloat(taskPrice) || 0;
  const escrowAmount = workerAmount > 0 ? workerAmount / (1 - platformFee) : 0;
  const commission = escrowAmount - workerAmount;
  const platformFeePercent = (platformFee * 100).toFixed(2);
  
  // Formatear montos con 7 decimales (USDC)
  const formattedWorkerAmount = workerAmount.toFixed(7);
  const formattedCommission = commission.toFixed(7);
  const formattedTotal = escrowAmount.toFixed(7);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<ProcessStep[]>([
    {
      id: 'connect',
      title: 'Conectar Wallet',
      description: 'Conecta tu wallet Freighter para continuar',
      icon: <FaWallet />,
      status: 'pending',
      buttonText: 'Conectar Wallet'
    },
    {
      id: 'create',
      title: 'Crear Contrato',
      description: 'Crea la cuenta escrow única en Stellar',
      icon: <FaFileContract />,
      status: 'pending',
      buttonText: 'Crear y Firmar Contrato'
    },
    {
      id: 'fund',
      title: 'Enviar Dinero',
      description: `Envía ${formattedTotal} USDC al contrato escrow`,
      icon: <FaCoins />,
      status: 'pending',
      buttonText: 'Enviar Dinero'
    },
    {
      id: 'complete',
      title: 'Proceso Completado',
      description: 'El trabajador ha sido seleccionado exitosamente',
      icon: <FaCheckCircle />,
      status: 'pending',
      buttonText: 'Ir a Supervisar'
    }
  ]);

  const [escrowId, setEscrowId] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const updateStepStatus = (stepIndex: number, status: ProcessStep['status']) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, status } : step
    ));
  };

  // Actualizar la descripción del paso "fund" cuando cambien los valores
  // IMPORTANTE: Solo actualizar la descripción, preservar el status para NO perder el progreso
  useEffect(() => {
    setSteps(prev => prev.map((step: ProcessStep) => {
      if (step.id === 'fund') {
        // CRÍTICO: Preservar el status actual, solo actualizar la descripción
        // Si el paso ya está completado o en progreso, NO cambiar el status
        return {
          ...step,
          description: `Envía ${formattedTotal} USDC al contrato escrow (incluye ${formattedCommission} USDC de comisión de plataforma)`
          // NO tocar step.status - preservar el progreso
        };
      }
      return step;
    }));
  }, [formattedTotal, formattedCommission]);

  // Verificar cuando todos los 4 pasos estén completados y mostrar popup de éxito
  useEffect(() => {
    const allStepsCompleted = steps.every(step => step.status === 'completed');
    
    if (allStepsCompleted && !hasRedirected && isOpen) {
      setHasRedirected(true);
      // Mostrar popup de éxito en lugar de redirigir automáticamente
      setShowSuccessPopup(true);
    }
  }, [steps, hasRedirected, isOpen]);

  // Función para manejar el botón del popup de éxito
  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    onClose();
    onComplete();
  };

  const handleGoToSupervise = () => {
    setShowSuccessPopup(false);
    onClose();
    if (taskId && acceptedApplicantId) {
      navigate(`/supervise-task/${taskId}/${acceptedApplicantId}`);
    } else {
      // Si no hay taskId o acceptedApplicantId, ir al dashboard
      onComplete();
    }
  };

  const handleStepAction = async (stepIndex: number) => {
    const step = steps[stepIndex];
    
    if (step.id === 'connect') {
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onConnectWallet();
        if (result.success) {
          updateStepStatus(stepIndex, 'completed');
          setCurrentStep(1);
        } else {
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error) {
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'create') {
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onCreateEscrow();
        if (result.success && result.escrowId) {
          setEscrowId(result.escrowId);
          updateStepStatus(stepIndex, 'completed');
          setCurrentStep(2);
        } else {
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error) {
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'fund') {
      if (!escrowId) return;
      
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onFundEscrow(escrowId);
        if (result.success && result.txHash) {
          updateStepStatus(stepIndex, 'completed');
          
          // Inmediatamente ejecutar la selección del trabajador en la base de datos
          updateStepStatus(3, 'in_progress'); // Marcar como en progreso
          
          try {
            const selectResult = await onSelectWorker(escrowId, result.txHash);
            if (selectResult.success) {
              updateStepStatus(3, 'completed');
              setCurrentStep(3); // Avanzar al último paso (índice 3, que es el paso 4)
              // El useEffect se encargará de redirigir cuando todos los pasos estén completados
            } else {
              updateStepStatus(3, 'error');
            }
          } catch (selectError) {
            updateStepStatus(3, 'error');
          }
        } else {
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error) {
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'complete') {
      // El trabajador ya fue seleccionado automáticamente en el paso anterior
      // Solo ejecutar la función de completar el proceso
      updateStepStatus(stepIndex, 'completed');
      // El useEffect se encargará de redirigir cuando todos los pasos estén completados
    }
  };

  const getStepIcon = (step: ProcessStep) => {
    if (step.status === 'in_progress') {
      return <FaSpinner className="animate-spin" />;
    }
    if (step.status === 'completed') {
      return <FaCheckCircle className="text-green-500" />;
    }
    if (step.status === 'error') {
      return <FaTimes className="text-red-500" />;
    }
    return step.icon;
  };


  if (!isOpen) return null;

  return (
    <div className="escrow-process-popup">
      <div className="escrow-process-content">
        {/* Header */}
        <div className="escrow-process-header">
          <h2 className="escrow-process-title">
            Proceso de Selección de Trabajador
          </h2>
          <button
            onClick={onClose}
            className="escrow-process-close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Task Info */}
        <div className="escrow-task-info">
          <h3>Detalles de la Tarea</h3>
          <div className="escrow-task-details">
            <p><strong>Trabajador:</strong> {contributorName}</p>
            <p><strong>Dirección:</strong> {contributorAddress.slice(0, 6)}...{contributorAddress.slice(-4)}</p>
            <p><strong>Monto de la tarea:</strong> {taskPrice} USDC</p>
            <p style={{ color: '#ffa500', marginTop: '0.5rem' }}>
              <strong> Nota:</strong> Se requiere una pequeña cantidad de XLM para fees de transacción de Stellar (~0.0001 XLM)
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="escrow-steps">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`escrow-step ${step.status}`}
            >
              <div className="escrow-step-content">
                <div className="escrow-step-info">
                  <div className="escrow-step-icon">
                    {getStepIcon(step)}
                  </div>
                  <div className="escrow-step-text">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
                
                <div className="escrow-step-action">
                  {step.buttonText && step.status === 'pending' && index === currentStep && (
                    <button
                      onClick={() => handleStepAction(index)}
                      className="escrow-step-button"
                    >
                      {step.buttonText}
                    </button>
                  )}
                  
                  {step.status === 'in_progress' && (
                    <div className="escrow-step-status">
                      Procesando...
                    </div>
                  )}
                  
                  {step.status === 'completed' && (
                    <div className="escrow-step-status">
                      Completado
                    </div>
                  )}
                  
                  {step.status === 'error' && (
                    <button
                      onClick={() => handleStepAction(index)}
                      className="escrow-step-button error"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Indicator */}
        <div className="escrow-progress">
          <div className="escrow-progress-header">
            <span>Progreso</span>
            <span>
              {(() => {
                // Calcular pasos completados basado en el estado real, no en currentStep
                const completedSteps = steps.filter(step => step.status === 'completed').length;
                // Si todos están completados, mostrar el total
                const totalSteps = steps.length;
                const displayStep = completedSteps > 0 ? completedSteps : Math.min(currentStep + 1, totalSteps);
                return `${displayStep} de ${totalSteps}`;
              })()}
            </span>
          </div>
          <div className="escrow-progress-bar">
            <div
              className="escrow-progress-fill"
              style={{ 
                width: `${(() => {
                  // Calcular porcentaje basado en pasos completados
                  const completedSteps = steps.filter(step => step.status === 'completed').length;
                  const totalSteps = steps.length;
                  return completedSteps > 0 
                    ? (completedSteps / totalSteps) * 100 
                    : Math.min(((currentStep + 1) / totalSteps) * 100, 100);
                })()}%` 
              }}
            />
          </div>
        </div>

        {/* Info */}
        <div className="escrow-process-note">
          <p> <strong>Nota:</strong> Este proceso requiere 2 transacciones:</p>
          <p>1. Crear el contrato escrow</p>
          <p>2. Enviar el dinero al contrato</p>
          <div style={{ 
            marginTop: '0.5rem', 
            padding: '16px', 
            background: 'linear-gradient(135deg, rgba(40, 192, 240, 0.1) 0%, rgba(17, 128, 179, 0.1) 100%)',
            borderRadius: '12px', 
            border: '1px solid rgba(40, 192, 240, 0.3)'
          }}>
            <p style={{ 
              fontWeight: 'bold', 
              marginBottom: '12px',
              color: '#28c0f0',
              fontSize: '15px'
            }}>
               Desglose del pago:
            </p>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              marginBottom: '12px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid rgba(40, 192, 240, 0.2)'
              }}>
                <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Pago al trabajador:
                </span>
                <strong style={{ fontSize: '14px', color: '#fff' }}>
                  {formattedWorkerAmount} USDC
                </strong>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid rgba(40, 192, 240, 0.2)'
              }}>
                <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Comisión de plataforma ({platformFeePercent}%):
                </span>
                <strong style={{ fontSize: '14px', color: '#fff' }}>
                  {formattedCommission} USDC
                </strong>
              </div>
            </div>
            <div style={{ 
              padding: '12px',
              background: 'linear-gradient(90deg, rgba(40, 192, 240, 0.2) 0%, rgba(17, 128, 179, 0.2) 100%)',
              borderRadius: '8px',
              border: '1px solid rgba(40, 192, 240, 0.4)',
              marginTop: '8px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: '#28c0f0', 
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FaDollarSign /> Total a enviar:
                </span>
                <strong style={{ 
                  fontSize: '18px', 
                  background: 'linear-gradient(90deg, #28c0f0, #1180b3)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {formattedTotal} USDC
                </strong>
              </div>
              <p style={{ 
                margin: '8px 0 0 0', 
                fontSize: '12px', 
                color: 'rgba(255, 255, 255, 0.6)', 
                fontStyle: 'italic',
                textAlign: 'center'
              }}>
                + fees de XLM (~0.0001 XLM)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Popup de Éxito */}
      {showSuccessPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(7, 35, 60, 0.95) 0%, rgba(10, 45, 74, 0.95) 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #07233c 0%, #0a2d4a 100%)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '550px',
            width: '90%',
            textAlign: 'center',
            border: '1px solid rgba(40, 192, 240, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Borde superior con gradiente Arcus X */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #28c0f0, #1180b3)'
            }} />
            
            <div style={{
              fontSize: '72px',
              marginBottom: '24px',
              filter: 'drop-shadow(0 4px 8px rgba(40, 192, 240, 0.3))'
            }}>
              
            </div>
            
            <h3 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #28c0f0, #1180b3)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '20px',
              marginTop: 0
            }}>
              ¡Proceso Completado Exitosamente!
            </h3>
            
            <div style={{
              marginBottom: '30px',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.6'
            }}>
              <p style={{ 
                fontSize: '16px', 
                marginBottom: '20px', 
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                El trabajador ha sido seleccionado y el escrow está configurado correctamente
              </p>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(40, 192, 240, 0.1) 0%, rgba(17, 128, 179, 0.1) 100%)',
                padding: '20px',
                borderRadius: '12px',
                marginTop: '15px',
                textAlign: 'left',
                border: '1px solid rgba(40, 192, 240, 0.2)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(40, 192, 240, 0.2)'
                }}>
                  <span style={{ fontSize: '18px' }}></span>
                  <strong style={{ fontSize: '15px', color: '#fff' }}>
                    Contrato escrow creado
                  </strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(40, 192, 240, 0.2)'
                }}>
                  <span style={{ fontSize: '18px' }}></span>
                  <strong style={{ fontSize: '15px', color: '#fff' }}>
                    Fondos enviados al escrow
                  </strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '18px' }}></span>
                  <strong style={{ fontSize: '15px', color: '#fff' }}>
                    Trabajador seleccionado
                  </strong>
                </div>
                {escrowId && (
                  <div style={{ 
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(40, 192, 240, 0.2)'
                  }}>
                    <p style={{ 
                      fontSize: '13px', 
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: 0
                    }}>
                      <strong style={{ color: '#28c0f0' }}>Contract ID:</strong>{' '}
                      <code style={{ 
                        color: '#28c0f0',
                        background: 'rgba(40, 192, 240, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {escrowId.slice(0, 8)}...{escrowId.slice(-8)}
                      </code>
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleGoToSupervise}
                style={{
                  background: 'linear-gradient(90deg, #28c0f0, #1180b3)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '200px',
                  boxShadow: '0 4px 12px rgba(40, 192, 240, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #1180b3, #28c0f0)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(40, 192, 240, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #28c0f0, #1180b3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 192, 240, 0.3)';
                }}
              >
                Supervisar Tarea
              </button>
              <button 
                onClick={handleSuccessPopupClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '14px 32px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '200px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FaHome style={{ marginRight: '8px' }} /> Ir al Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscrowProcessPopup;
