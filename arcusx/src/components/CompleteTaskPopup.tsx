import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaSpinner, FaTimes, FaHandshake, FaCoins, FaDollarSign, FaStar } from 'react-icons/fa';
import { usePlatformFee } from '../hooks/usePlatformFee';
import { useI18n } from '../i18n/I18nProvider';
import { createRating, CreateRatingPayload } from '../services/ratingService';
import { devLog, devWarn, devError } from '../utils/logger';
import { quoteEscrowCommission } from '../utils/escrowFeeQuote';
import { workerNetFromTaskPrice } from '../utils/bilateralFeeModel';
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
  agreementId?: string;
  workerId?: number;
};

export type ReleasePersistPayload = {
  releaseTxHash?: string;
  rating?: number;
  taskId?: number;
  agreementId?: string;
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
  /** Tras liberar on-chain: persiste complete_task / mark_deal_released + rating en BD. */
  onPersistRelease?: (payload: ReleasePersistPayload) => Promise<{ success: boolean; error?: string }>;
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
  onPersistRelease,
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
  
  const nominal = parseFloat(taskPrice) || 0;
  const workerAmount = nominal > 0 ? workerNetFromTaskPrice(taskPrice) : 0;
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
        if (!result.success) {
          setStepError(result.error || t('complete.step.release.error'));
          updateStepStatus(stepIndex, 'error');
          return;
        }

        const txHash = result.txHash;
        if (!result.alreadyReleased && txHash) {
          setReleaseTxHash(txHash);
        }

        const persistPayload: ReleasePersistPayload = {
          releaseTxHash: txHash,
          rating: ratingSubmitted && rating > 0 ? rating : undefined,
          taskId,
          agreementId,
          workerId,
        };

        if (onPersistRelease) {
          const persisted = await onPersistRelease(persistPayload);
          if (!persisted.success) {
            setStepError(persisted.error || t('complete.step.release.error'));
            updateStepStatus(stepIndex, 'error');
            return;
          }
          if (persistPayload.rating) {
            setRatingSentToServer(true);
          }
        } else if (rating > 0 && ratingSubmitted) {
          const ratingOk = await submitRatingToServer();
          if (!ratingOk) {
            setStepError(ratingError || t('complete.rating.error'));
            updateStepStatus(stepIndex, 'error');
            return;
          }
        }

        updateStepStatus(stepIndex, 'completed');
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
      return <FaCheckCircle className="icon-success" />;
    }
    if (step.status === 'error') {
      return <FaTimes className="icon-error" />;
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
      agreementId,
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
            <p className="escrow-task-note">
              <strong>{t('common.nota')}</strong> {t('complete.popup.note.twoSignatures')}
            </p>
            <ul className="escrow-task-bullets">
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
                  <div className="complete-popup-rating-wrap">
                    <h3 className="complete-popup-rating-title">
                      {t('complete.popup.rateWorker')}
                    </h3>
                    <div className="complete-popup-rating-box">
                    <div className="complete-popup-star-row">
                      {[1, 2, 3, 4, 5].map((value) => {
                        const displayRating = ratingSubmitted ? rating : (hoveredRating || rating);
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`complete-popup-star-btn ${value <= displayRating ? 'active' : ''}`}
                            onClick={() => !ratingSubmitted && handleStarClick(value)}
                            onMouseEnter={() => !ratingSubmitted && handleStarHover(value)}
                            onMouseLeave={() => !ratingSubmitted && handleStarLeave()}
                            disabled={submittingRating || ratingSubmitted}
                          >
                            <FaStar />
                          </button>
                        );
                      })}
                    </div>
                    
                    {ratingError && (
                      <div className="complete-popup-msg-error">
                        {ratingError}
                      </div>
                    )}
                    
                    <div className="complete-popup-rating-actions">
                      {!ratingSubmitted && (
                        <button
                          onClick={handleSubmitRating}
                          disabled={submittingRating || rating === 0}
                          className="escrow-step-button"
                          style={{ minWidth: '200px' }}
                        >
                          {submittingRating ? t('complete.rating.sending') : t('complete.rating.confirm')}
                        </button>
                      )}
                      {ratingSubmitted && !submittingRating && !ratingError && (
                        <div className="complete-popup-msg-success">
                          <FaCheckCircle /> {t('complete.popup.ratingSelected')}
                        </div>
                      )}
                      {submittingRating && (
                        <div className="complete-popup-msg-info">
                          <FaSpinner className="animate-spin" /> {t('complete.popup.sendingRating')}
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
          <p className="escrow-step-error" role="alert">
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
          <div className="complete-popup-fee-panel">
            <p className="complete-popup-fee-title">
               Desglose del pago:
            </p>
            <div className="complete-popup-fee-rows">
              <div className="complete-popup-fee-row">
                <span className="complete-popup-fee-label">
                  {t('complete.popup.workerPaymentLabel')}
                </span>
                <strong className="complete-popup-fee-value">
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
            <div className="complete-popup-fee-total">
              <div className="complete-popup-fee-row complete-popup-fee-total-row">
                <span className="complete-popup-fee-total-label">
                  <FaDollarSign /> Total del escrow:
                </span>
                <strong className="complete-popup-fee-total-value">
                  {formattedTotal} USDC
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popup de Éxito */}
      {showSuccessPopup && (
        <div className="complete-popup-success-overlay">
          <div className="complete-popup-success-card">
            <h3 className="complete-popup-success-title">
              {t('complete.success.title')}
            </h3>
            
            <div className="complete-popup-success-body">
              <p className="complete-popup-success-lead">
                {t('complete.success.milestoneMessage')}
              </p>
              
              <div className="complete-popup-success-summary">
                <div className="complete-popup-success-summary-row">
                  <strong>{t('complete.success.milestoneTitle')}</strong>
                </div>
                <div className="complete-popup-success-summary-row">
                  <strong>
                    {t('complete.success.fundsReleased').replace('{{amount}}', formattedWorkerAmount)}
                  </strong>
                </div>
                {releaseTxHash ? (
                  <div className="complete-popup-success-tx">
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
            
            <div className="complete-popup-success-actions">
              <button
                type="button"
                onClick={() => finalizeSuccessPopup('stay')}
                className="complete-popup-btn-primary"
              >
                {t('supervise.popup.backToTask')}
              </button>
              <button
                type="button"
                onClick={() => finalizeSuccessPopup('dashboard')}
                className="complete-popup-btn-secondary"
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

