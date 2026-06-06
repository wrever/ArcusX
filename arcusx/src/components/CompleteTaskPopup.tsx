import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaSpinner, FaTimes, FaHandshake, FaCoins, FaDollarSign, FaStar } from 'react-icons/fa';
import { usePlatformFee } from '../hooks/usePlatformFee';
import { useI18n } from '../i18n/I18nProvider';
import { createRating, CreateRatingPayload } from '../services/ratingService';
import { devLog, devWarn, devError } from '../utils/logger';
import { quoteEscrowCommission } from '../utils/escrowFeeQuote';
import EscrowFeeBreakdown from './EscrowFeeBreakdown';
import StellarTxHashLink from './StellarTxHashLink';
import TaskDeletionNotice from './TaskDeletionNotice';
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

export type TaskCompletionPayload = {
  releaseTxHash?: string;
  rating?: number;
  taskId?: number;
  workerId?: number;
};

interface CompleteTaskPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (payload?: TaskCompletionPayload) => void;
  taskPrice: string;
  escrowId: string;
  clientAddress: string;
  taskId?: number;
  agreementId?: string;
  workerId?: number;
  workerName?: string;
  popupTitle?: string;
  onApproveMilestone: () => Promise<{ success: boolean; txHash?: string; error?: string; alreadyApproved?: boolean }>;
  onReleaseFunds: () => Promise<{ success: boolean; txHash?: string; error?: string; alreadyReleased?: boolean }>;
  onVerifyMilestone: () => Promise<boolean>;
  onStayOnSupervision?: () => void;
  onGoToDashboard?: () => void;
  /** Fee ArcusX bloqueado en el deal (ej. 0.027); si no se pasa, usa el fee live del sistema. */
  platformFeeOverride?: number;
}

const CompleteTaskPopup: React.FC<CompleteTaskPopupProps> = ({
  isOpen,
  onClose,
  onComplete,
  taskPrice,
  escrowId,
  clientAddress,
  taskId,
  agreementId,
  workerId,
  workerName,
  popupTitle,
  onApproveMilestone,
  onReleaseFunds,
  onVerifyMilestone,
  onStayOnSupervision,
  onGoToDashboard,
  platformFeeOverride,
}) => {
  const { platformFee: livePlatformFee } = usePlatformFee();
  const platformFee = platformFeeOverride ?? livePlatformFee;
  const { t } = useI18n();
  
  // Estados para rating
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingSentToServer, setRatingSentToServer] = useState(false);
  
  const workerAmount = parseFloat(taskPrice) || 0;
  const quote = workerAmount > 0 ? quoteEscrowCommission(workerAmount, platformFee) : null;
  const escrowAmount = quote?.fundAmount ?? 0;
  const commission = quote?.totalCommission ?? 0;
  const platformCommission = quote?.platformCommission ?? 0;
  const protocolCommission = quote?.protocolCommission ?? 0;
  
  // Formatear montos con 7 decimales (USDC)
  const formattedWorkerAmount = workerAmount.toFixed(7);
  const formattedCommission = commission.toFixed(7);
  const formattedPlatformCommission = platformCommission.toFixed(7);
  const formattedProtocolCommission = protocolCommission.toFixed(7);
  const formattedTotal = escrowAmount.toFixed(7);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<ProcessStep[]>([
    {
      id: 'rating',
      title: t('complete.step.rating.title'),
      description: workerName ? t('complete.step.rating.description').replace('{{name}}', workerName) : t('complete.step.rating.descriptionFallback'),
      icon: <FaStar />,
      status: 'pending',
      buttonText: t('complete.rating.confirm'),
      disabled: false
    },
    {
      id: 'approve',
      title: t('complete.step.approve.title'),
      description: t('complete.step.approve.description'),
      icon: <FaHandshake />,
      status: 'pending',
      buttonText: t('complete.step.approve.button'),
      disabled: true // Bloqueado hasta que se califique
    },
    {
      id: 'release',
      title: t('complete.step.release.title'),
      description: t('complete.step.release.description').replace('{{amount}}', formattedWorkerAmount),
      icon: <FaCoins />,
      status: 'pending',
      buttonText: t('complete.step.release.button'),
      disabled: true // Inicialmente bloqueado
    }
  ]);

  const [milestoneApproved, setMilestoneApproved] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [releaseTxHash, setReleaseTxHash] = useState<string | undefined>();
  const [stepError, setStepError] = useState<string | null>(null);

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
      setRatingSentToServer(false);
      setRatingError(null);
      setStepError(null);
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

  // Éxito cuando approve + release están confirmados (rating es posterior, no bloquea)
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
      setRatingError(t('complete.rating.required'));
      return;
    }

    // Solo guardar el rating localmente, NO enviarlo al servidor todavía
    setRatingSubmitted(true);
    updateStepStatus(0, 'completed');
    updateStepDisabled(1, false); // Habilitar botón de aprobar milestone
    setCurrentStep(1);
    setRatingError(null);
  };

  const isDuplicateRatingError = (message: string) =>
    /ya calificaste|ya existe una valoraci[oó]n/i.test(message);

  /** Persiste rating en BD solo después de approve + release confirmados on-chain. */
  const submitRatingToServer = async (): Promise<boolean> => {
    if (ratingSentToServer) return true;

    const hasTarget = (taskId && workerId) || (agreementId && workerId);
    if (!hasTarget || rating === 0) {
      devWarn('No se puede enviar rating: datos faltantes', { taskId, agreementId, workerId, rating });
      return false;
    }

    setSubmittingRating(true);
    setRatingError(null);
    
    try {
      const payload: CreateRatingPayload = {
        ...(taskId ? { task_id: taskId } : {}),
        ...(agreementId ? { agreement_id: agreementId } : {}),
        rated_user_id: workerId!,
        rating,
        review: undefined,
      };

      devLog('Enviando rating al servidor tras liberar fondos...', payload);
      const result = await createRating(payload);
      devLog('Rating enviado exitosamente:', result);
      setRatingSentToServer(true);
      setRatingError(null);
      return true;
    } catch (err: any) {
      const message = String(err?.message ?? '');
      if (isDuplicateRatingError(message)) {
        setRatingSentToServer(true);
        setRatingError(null);
        return true;
      }
      devError('Error al enviar rating:', err);
      setRatingError(`${t('complete.rating.error')}: ${message}`);
      return false;
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
      setStepError(null);
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onApproveMilestone();
        if (result.success) {
          updateStepStatus(stepIndex, 'completed');
          setMilestoneApproved(true);
          
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
          setStepError(result.error || t('complete.step.approve.error'));
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error: any) {
        setStepError(error?.message || t('complete.step.approve.error'));
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'release') {
      if (!milestoneApproved) {
        // El milestone debe estar aprobado antes de liberar fondos
        return;
      }
      
      setStepError(null);
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onReleaseFunds();
        if (result.success) {
          if (!result.alreadyReleased) {
            setReleaseTxHash(result.txHash);
          }

          // Liberación confirmada on-chain → paso completado siempre
          updateStepStatus(stepIndex, 'completed');

          // Rating guardado en UI al inicio; se persiste automáticamente tras release OK
          if (rating > 0 && ratingSubmitted) {
            void submitRatingToServer();
          }
        } else {
          setStepError(result.error || t('complete.step.release.error'));
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error: any) {
        setStepError(error?.message || t('complete.step.release.error'));
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

  const finalizeSuccessPopup = (action: 'stay' | 'dashboard') => {
    setShowSuccessPopup(false);
    onClose();
    onComplete({
      releaseTxHash,
      rating: rating > 0 ? rating : undefined,
      taskId,
      workerId,
    });
    if (action === 'dashboard') {
      onGoToDashboard?.();
    } else {
      onStayOnSupervision?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="escrow-process-popup">
      <div className="escrow-process-content">
        {/* Header */}
        <div className="escrow-process-header">
          <h2 className="escrow-process-title">
            {popupTitle ?? 'Completar Tarea'}
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
          <h3>{t('escrow.task.details')}</h3>
          <div className="escrow-task-details">
            <p><strong>{t('complete.popup.label.clientAddress')}</strong> {clientAddress.slice(0, 6)}...{clientAddress.slice(-4)}</p>
            <p><strong>{t('complete.popup.label.taskAmount')}</strong> {taskPrice} USDC</p>
            <p><strong>{t('complete.popup.label.contractId')}</strong> {escrowId.slice(0, 8)}...{escrowId.slice(-8)}</p>
            <p style={{ color: '#ffa500', marginTop: '0.5rem' }}>
              <strong>{t('common.nota')}</strong> {t('complete.popup.note.twoSignatures')}
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '0.5rem' }}>
              <li>1. {t('complete.popup.bullet1.approve')}</li>
              <li>2. {t('complete.popup.bullet2.release')}</li>
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
                      {t('complete.popup.rateWorker')}
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
                          {submittingRating ? t('complete.rating.sending') : t('complete.rating.confirm')}
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
                          <FaCheckCircle /> {t('complete.popup.ratingSelected')}
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
                          <FaSpinner className="animate-spin" /> {t('complete.popup.sendingRating')}
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
                        {step.buttonText} {t('complete.popup.blocked')}
                      </button>
                    )}
                    
                    {step.status === 'in_progress' && (
                      <div className="escrow-step-status">
                        {t('escrow.status.processing')}
                      </div>
                    )}
                    
                    {step.status === 'completed' && (
                      <div className="escrow-step-status">
                        {t('escrow.status.completed')}
                      </div>
                    )}
                    
                    {step.status === 'error' && (
                      <button
                        onClick={() => handleStepAction(index)}
                        className="escrow-step-button error"
                      >
                        {t('escrow.retry')}
                      </button>
                    )}
                  </div>
                </>
                )}
              </div>
            </div>
          ))}
        </div>

        {stepError && (
          <p className="escrow-step-error" role="alert" style={{ color: '#ef4444', margin: '12px 0', fontSize: '14px' }}>
            {stepError}
          </p>
        )}

        {/* Progress Indicator */}
        <div className="escrow-progress">
          <div className="escrow-progress-header">
            <span>{t('common.progress')}</span>
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
          <p><strong>{t('common.nota')}</strong> {t('complete.popup.note.threeSteps')}</p>
          <p>1. {t('complete.popup.step1.rate')}</p>
          <p>2. {t('complete.popup.step2.approve')}</p>
          <p>3. {t('complete.popup.step3.release')}</p>
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
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {t('complete.popup.workerPaymentLabel')}
                </span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  {formattedWorkerAmount} USDC
                </strong>
              </div>
              <EscrowFeeBreakdown
                layout="flex-rows"
                platformFee={platformFee}
                totalUsdc={formattedCommission}
                platformUsdc={formattedPlatformCommission}
                protocolUsdc={formattedProtocolCommission}
              />
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
              {t('complete.success.title')}
            </h3>
            
            <div style={{
              marginBottom: '30px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6'
            }}>
              <p style={{ 
                fontSize: '16px', 
                marginBottom: '20px', 
                fontWeight: '500',
                color: 'var(--text-secondary)'
              }}>
                {t('complete.success.milestoneMessage')}
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
                  <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                    {t('complete.success.milestoneTitle')}
                  </strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '18px' }}></span>
                  <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                    {t('complete.success.fundsReleased').replace('{{amount}}', formattedWorkerAmount)}
                  </strong>
                </div>
                {releaseTxHash ? (
                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(40, 192, 240, 0.2)',
                  }}>
                    <StellarTxHashLink
                      txHash={releaseTxHash}
                      label={t('complete.popup.txHash')}
                    />
                    <TaskDeletionNotice
                      completedAt={new Date().toISOString()}
                      escrowStatus="completed"
                      status="completed"
                      escrowReleaseTxHash={releaseTxHash}
                      clientAcceptedCompletion={1}
                      closureHints={{ taskFundsReleased: true }}
                      variant="inline"
                    />
                  </div>
                ) : null}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => finalizeSuccessPopup('stay')}
                style={{
                  background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                  color: 'var(--text-primary)',
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
              >
                {t('supervise.popup.backToTask')}
              </button>
              <button
                type="button"
                onClick={() => finalizeSuccessPopup('dashboard')}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '14px 32px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '200px'
                }}
              >
                {t('supervise.popup.goToDashboard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteTaskPopup;

