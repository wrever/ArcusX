import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaSpinner, FaTimes, FaHandshake, FaCoins, FaDollarSign, FaStar } from 'react-icons/fa';
import { usePlatformFee } from '../hooks/usePlatformFee';
import { createRating, CreateRatingPayload } from '../services/ratingService';
import '../css/ProposalReview.css';
import '../css/ReviewForm.css';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  buttonText?: string;
  onAction?: () => void;
  disabled?: boolean;
}

interface CompleteTaskPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  taskPrice: string;
  escrowId: string;
  clientAddress: string;
  taskId?: number;
  workerId?: number;
  workerName?: string;
  onApproveMilestone: () => Promise<{ success: boolean; txHash?: string; error?: string; alreadyApproved?: boolean }>;
  onReleaseFunds: () => Promise<{ success: boolean; txHash?: string; error?: string; alreadyReleased?: boolean }>;
  onVerifyMilestone: () => Promise<boolean>;
}

const CompleteTaskPopup: React.FC<CompleteTaskPopupProps> = ({
  isOpen,
  onClose,
  onComplete,
  taskPrice,
  escrowId,
  clientAddress,
  taskId,
  workerId,
  workerName,
  onApproveMilestone,
  onReleaseFunds,
  onVerifyMilestone
}) => {
  const { platformFee } = usePlatformFee();
  
  // Estados para rating
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  
  // Calcular montos
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
      id: 'rating',
      title: 'Calificar Trabajador',
      description: workerName ? `Califica a ${workerName}` : 'Califica al trabajador',
      icon: <FaStar />,
      status: 'pending',
      buttonText: 'Confirmar Calificación',
      disabled: false
    },
    {
      id: 'approve',
      title: 'Aprobar Milestone',
      description: 'Confirma que el trabajo está completado correctamente',
      icon: <FaHandshake />,
      status: 'pending',
      buttonText: 'Aprobar Milestone',
      disabled: true // Bloqueado hasta que se califique
    },
    {
      id: 'release',
      title: 'Liberar Fondos',
      description: `Libera ${formattedWorkerAmount} USDC al trabajador`,
      icon: <FaCoins />,
      status: 'pending',
      buttonText: 'Liberar Fondos',
      disabled: true // Inicialmente bloqueado
    }
  ]);

  const [milestoneApproved, setMilestoneApproved] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [releaseTxHash, setReleaseTxHash] = useState<string | undefined>();

  const updateStepStatus = (stepIndex: number, status: ProcessStep['status']) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, status } : step
    ));
  };

  const updateStepDisabled = (stepIndex: number, disabled: boolean) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, disabled } : step
    ));
  };

  // Resetear rating cuando se abre el popup
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setRatingSubmitted(false);
      setRatingError(null);
      setCurrentStep(0);
      // Resetear todos los pasos a pending excepto rating
      setSteps(prev => prev.map((step, index) => {
        if (index === 0) return { ...step, status: 'pending' as const, disabled: false };
        if (index === 1) return { ...step, status: 'pending' as const, disabled: true };
        return { ...step, status: 'pending' as const, disabled: true };
      }));
    }
  }, [isOpen]);

  // Verificar si el milestone ya está aprobado al abrir el popup (solo si rating ya fue enviado)
  useEffect(() => {
    if (isOpen && ratingSubmitted && !milestoneApproved) {
      checkMilestoneStatus();
    }
  }, [isOpen, ratingSubmitted]);

  const checkMilestoneStatus = async () => {
    try {
      const isApproved = await onVerifyMilestone();
      if (isApproved) {
        setMilestoneApproved(true);
        updateStepStatus(1, 'completed'); // Actualizar paso de "approve" (step 1)
        updateStepDisabled(2, false); // Habilitar botón de liberar fondos (step 2)
        setCurrentStep(2);
      }
    } catch (error) {
    }
  };

  // Verificar cuando ambos pasos estén completados
  useEffect(() => {
    const allStepsCompleted = steps.every(step => step.status === 'completed');
    
    if (allStepsCompleted && isOpen && !showSuccessPopup) {
      setShowSuccessPopup(true);
    }
  }, [steps, isOpen, showSuccessPopup]);

  const handleStarClick = (value: number) => {
    setRating(value);
    setRatingError(null);
  };

  const handleStarHover = (value: number) => {
    setHoveredRating(value);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      setRatingError('Por favor, selecciona una calificación (1-5 estrellas)');
      return;
    }

    // Solo guardar el rating localmente, NO enviarlo al servidor todavía
    setRatingSubmitted(true);
    updateStepStatus(0, 'completed');
    updateStepDisabled(1, false); // Habilitar botón de aprobar milestone
    setCurrentStep(1);
    setRatingError(null);
  };

  // Función para enviar el rating al servidor (solo después de liberar fondos exitosamente)
  const submitRatingToServer = async () => {
    if (!taskId || !workerId || rating === 0) {
      console.warn('No se puede enviar rating: datos faltantes', { taskId, workerId, rating });
      return; // No hay rating para enviar
    }

    setSubmittingRating(true);
    setRatingError(null);
    
    try {
      const payload: CreateRatingPayload = {
        task_id: taskId,
        rated_user_id: workerId,
        rating,
        review: undefined // Solo rating, sin review opcional por ahora
      };

      console.log('Enviando rating al servidor...', payload);
      const result = await createRating(payload);
      console.log('Rating enviado exitosamente:', result);
      
      setRatingError(null);
    } catch (err: any) {
      console.error('Error al enviar rating:', err);
      setRatingError(`Error al enviar calificación: ${err.message || 'Error desconocido'}`);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleStepAction = async (stepIndex: number) => {
    const step = steps[stepIndex];
    
    if (step.id === 'rating') {
      await handleSubmitRating();
      return;
    }
    
    if (step.id === 'approve') {
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onApproveMilestone();
        if (result.success) {
          // Milestone aprobado exitosamente
          updateStepStatus(stepIndex, 'completed');
          setMilestoneApproved(true);
          
          // IMPORTANTE: Enviar el rating al servidor tan pronto como se apruebe el milestone
          if (rating > 0 && ratingSubmitted) {
            console.log('Milestone aprobado. Enviando rating al servidor...');
            // Enviar rating en background (no bloquear la UI)
            submitRatingToServer().catch(err => {
              console.error('Error crítico al enviar rating:', err);
            });
          }
          
          //  HABILITAR INMEDIATAMENTE: Si la aprobación fue exitosa, habilitar el botón de liberar sin esperar
          updateStepDisabled(2, false); // Habilitar botón de liberar fondos inmediatamente (step 2)
          setCurrentStep(2);
          
          // Verificar en background (sin bloquear la UI)
          setTimeout(async () => {
            try {
              const isApproved = await onVerifyMilestone();
              if (!isApproved) {
                // Si por alguna razón no está aprobado, intentar una vez más
                setTimeout(async () => {
                  const retryApproved = await onVerifyMilestone();
                  if (!retryApproved && process.env.NODE_ENV === 'development') {
                  }
                }, 2000);
              }
            } catch (error) {
              // Error silencioso en verificación background
            }
          }, 1000);
        } else {
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error: any) {
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'release') {
      if (!milestoneApproved) {
        // El milestone debe estar aprobado antes de liberar fondos
        return;
      }
      
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onReleaseFunds();
        if (result.success) {
          if (!result.alreadyReleased) {
            setReleaseTxHash(result.txHash);
          }
          updateStepStatus(stepIndex, 'completed');
        } else {
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error: any) {
        updateStepStatus(stepIndex, 'error');
      }
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

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    onClose();
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="escrow-process-popup">
      <div className="escrow-process-content">
        {/* Header */}
        <div className="escrow-process-header">
          <h2 className="escrow-process-title">
            Completar Tarea
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
            <p><strong>Dirección del cliente:</strong> {clientAddress.slice(0, 6)}...{clientAddress.slice(-4)}</p>
            <p><strong>Monto de la tarea:</strong> {taskPrice} USDC</p>
            <p><strong>Contract ID:</strong> {escrowId.slice(0, 8)}...{escrowId.slice(-8)}</p>
            <p style={{ color: '#ffa500', marginTop: '0.5rem' }}>
              <strong> Nota:</strong> Este proceso requiere 2 firmas:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '0.5rem' }}>
              <li>1. Aprobar el milestone (confirmar que el trabajo está completo)</li>
              <li>2. Liberar los fondos al trabajador</li>
            </ul>
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
                {/* Rating Step - UI especial con título */}
                {step.id === 'rating' ? (
                  <div style={{ width: '100%' }}>
                    <h3 style={{ 
                      textAlign: 'center', 
                      marginBottom: '24px',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: 'var(--text-primary)'
                    }}>
                      Califica al trabajador
                    </h3>
                    <div className="rating-step-content" style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      padding: '40px 20px',
                      background: 'rgba(40, 192, 240, 0.05)',
                      borderRadius: '12px',
                      border: '1px solid rgba(40, 192, 240, 0.2)',
                      minHeight: '250px',
                      margin: '0 auto',
                      maxWidth: '500px'
                    }}>
                    <div className="star-rating-input" style={{
                      display: 'flex',
                      gap: '12px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: '24px'
                    }}>
                      {[1, 2, 3, 4, 5].map((value) => {
                        const displayRating = ratingSubmitted ? rating : (hoveredRating || rating);
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`star-button ${value <= displayRating ? 'active' : ''}`}
                            onClick={() => !ratingSubmitted && handleStarClick(value)}
                            onMouseEnter={() => !ratingSubmitted && handleStarHover(value)}
                            onMouseLeave={() => !ratingSubmitted && handleStarLeave()}
                            disabled={submittingRating || ratingSubmitted}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: submittingRating || ratingSubmitted ? 'not-allowed' : 'pointer',
                              fontSize: '40px',
                              color: value <= displayRating ? '#ffc107' : 'rgba(255, 255, 255, 0.3)',
                              transition: 'all 0.2s ease',
                              padding: '8px',
                              transform: value <= displayRating ? 'scale(1.1)' : 'scale(1)'
                            }}
                          >
                            <FaStar />
                          </button>
                        );
                      })}
                    </div>
                    
                    {ratingError && (
                      <div style={{
                        color: '#ef4444',
                        fontSize: '14px',
                        textAlign: 'center',
                        marginBottom: '16px'
                      }}>
                        {ratingError}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      {!ratingSubmitted && (
                        <button
                          onClick={handleSubmitRating}
                          disabled={submittingRating || rating === 0}
                          className="escrow-step-button"
                          style={{
                            opacity: rating === 0 ? 0.5 : 1,
                            cursor: rating === 0 ? 'not-allowed' : 'pointer',
                            minWidth: '200px'
                          }}
                        >
                          {submittingRating ? 'Enviando...' : 'Confirmar Calificación'}
                        </button>
                      )}
                      {ratingSubmitted && !submittingRating && !ratingError && (
                        <div style={{
                          color: '#10b981',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <FaCheckCircle /> Calificación seleccionada
                        </div>
                      )}
                      {submittingRating && (
                        <div style={{
                          color: '#3b82f6',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <FaSpinner className="animate-spin" /> Enviando calificación...
                        </div>
                      )}
                      {ratingError && (
                        <div style={{
                          color: '#ef4444',
                          fontSize: '14px',
                          textAlign: 'center',
                          marginTop: '8px'
                        }}>
                          {ratingError}
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="escrow-step-info">
                      <div className="escrow-step-icon">
                        {getStepIcon(step)}
                      </div>
                      <div className="escrow-step-text">
                        <h3>{step.title}</h3>
                        <p>{step.description}</p>
                      </div>
                    </div>
                    
                    {/* Otros pasos - UI normal */}
                    <div className="escrow-step-action">
                      {step.buttonText && step.status === 'pending' && index === currentStep && !step.disabled && (
                      <button
                        onClick={() => handleStepAction(index)}
                        className="escrow-step-button"
                      >
                        {step.buttonText}
                      </button>
                    )}
                    
                    {step.disabled && step.status === 'pending' && (
                      <button
                        disabled
                        className="escrow-step-button"
                        style={{ opacity: 0.5, cursor: 'not-allowed' }}
                      >
                        {step.buttonText} (Bloqueado)
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
                </>
                )}
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
                const completedSteps = steps.filter(step => step.status === 'completed').length;
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
          <p> <strong>Nota:</strong> Este proceso requiere 3 pasos:</p>
          <p>1. Calificar al trabajador (obligatorio)</p>
          <p>2. Aprobar el milestone (confirmar que el trabajo está completo)</p>
          <p>3. Liberar los fondos al trabajador</p>
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
              color: '#10dd88',
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
                  color: '#10dd88', 
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FaDollarSign /> Total del escrow:
                </span>
                <strong style={{ 
                  fontSize: '18px', 
                  background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {formattedTotal} USDC
                </strong>
              </div>
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
              background: 'linear-gradient(90deg, #10dd88, #0ab86a)'
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
              background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '20px',
              marginTop: 0
            }}>
              ¡Tarea Completada Exitosamente!
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
                El milestone ha sido aprobado y los fondos han sido liberados al trabajador
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
                    Milestone aprobado
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
                    Fondos liberados: {formattedWorkerAmount} USDC
                  </strong>
                </div>
                {releaseTxHash && (
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
                      <strong style={{ color: '#10dd88' }}>Transaction Hash:</strong>{' '}
                      <code style={{ 
                        color: '#10dd88',
                        background: 'rgba(40, 192, 240, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {releaseTxHash.slice(0, 8)}...{releaseTxHash.slice(-8)}
                      </code>
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleSuccessPopupClose}
                style={{
                  background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
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
                  e.currentTarget.style.background = 'linear-gradient(90deg, #0ab86a, #10dd88)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(40, 192, 240, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #10dd88, #0ab86a)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 192, 240, 0.3)';
                }}
              >
                 Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteTaskPopup;

