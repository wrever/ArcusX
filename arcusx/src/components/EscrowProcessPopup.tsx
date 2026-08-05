import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaWallet, FaFileContract, FaCoins, FaCheckCircle, FaSpinner, FaTimes, FaHome, FaDollarSign } from 'react-icons/fa';
import { usePlatformFee } from '../hooks/usePlatformFee';
import { useI18n } from '../i18n/I18nProvider';
import { quoteEscrowCommission } from '../utils/escrowFeeQuote';
import { quoteBilateralFromNominal } from '../utils/bilateralFeeModel';
import EscrowFeeBreakdown from './EscrowFeeBreakdown';
import '../css/ProposalReview.css';

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
  /** Reanudar flujo con contrato ya desplegado (pasos connect/create completados) */
  initialEscrowId?: string | null;
  resumeFromFundStep?: boolean;
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
  onConnectWallet,
  initialEscrowId = null,
  resumeFromFundStep = false,
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  // Obtener platform fee para calcular el total con comisión
  const { platformFee } = usePlatformFee();
  
  const nominal = parseFloat(taskPrice) || 0;
  const bilateral = nominal > 0 ? quoteBilateralFromNominal(nominal, platformFee) : null;
  const workerAmount = bilateral?.workerNet ?? 0;
  const quote = workerAmount > 0 ? quoteEscrowCommission(workerAmount, platformFee) : null;
  const escrowAmount = quote?.fundAmount ?? bilateral?.clientTotal ?? 0;
  const commission = bilateral?.totalCommission ?? quote?.totalCommission ?? 0;
  const formattedWorkerAmount = workerAmount.toFixed(7);
  const formattedCommission = commission.toFixed(7);
  const formattedTotal = escrowAmount.toFixed(7);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<ProcessStep[]>([
    {
      id: 'connect',
      title: t('escrow.step.connect.title'),
      description: t('escrow.step.connect.description'),
      icon: <FaWallet />,
      status: 'pending',
      buttonText: t('escrow.step.connect.button')
    },
    {
      id: 'create',
      title: t('escrow.step.create.title'),
      description: t('escrow.step.create.description'),
      icon: <FaFileContract />,
      status: 'pending',
      buttonText: t('escrow.step.create.button')
    },
    {
      id: 'fund',
      title: t('escrow.step.fund.title'),
      description: t('escrow.step.fund.description.short').replace('{{total}}', formattedTotal),
      icon: <FaCoins />,
      status: 'pending',
      buttonText: t('escrow.step.fund.button')
    },
    {
      id: 'complete',
      title: t('escrow.step.complete.title'),
      description: t('escrow.step.complete.description'),
      icon: <FaCheckCircle />,
      status: 'pending',
      buttonText: t('escrow.go.supervise')
    }
  ]);

  const [escrowId, setEscrowId] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
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
          description:
            t('escrow.step.fund.description')
              .replace('{{total}}', formattedTotal)
              .replace('{{commission}}', formattedCommission) +
            ' ' +
            t('escrow.fund.freighter.hint').replace('{{total}}', formattedTotal),
          // NO tocar step.status - preservar el progreso
        };
      }
      return step;
    }));
  }, [formattedTotal, formattedCommission, t]);

  // Reanudar en paso de fondeo si ya existe contrato sin fondos
  useEffect(() => {
    if (!isOpen || !resumeFromFundStep || !initialEscrowId) return;
    setEscrowId(initialEscrowId);
    setCurrentStep(2);
    setSteps((prev) =>
      prev.map((step, index) => {
        if (index < 2) return { ...step, status: 'completed' as const };
        if (step.id === 'fund') return { ...step, status: 'pending' as const };
        return { ...step, status: 'pending' as const };
      }),
    );
    setStepError(null);
    setShowSuccessPopup(false);
    setHasRedirected(false);
  }, [isOpen, resumeFromFundStep, initialEscrowId]);

  // Éxito solo si el paso de fondeo quedó completado (fondos bloqueados + trabajador asignado)
  useEffect(() => {
    const fundStep = steps.find((s) => s.id === 'fund');
    const allStepsCompleted = steps.every((step) => step.status === 'completed');
    const fundCompleted = fundStep?.status === 'completed';

    if (allStepsCompleted && fundCompleted && !hasRedirected && isOpen) {
      setHasRedirected(true);
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
    const fundStep = steps.find((s) => s.id === 'fund');
    if (fundStep?.status !== 'completed') {
      setStepError(t('proposals.error.superviseRequiresFunding'));
      setShowSuccessPopup(false);
      return;
    }
    setShowSuccessPopup(false);
    onClose();
    if (taskId && acceptedApplicantId) {
      navigate(`/supervise-task/${taskId}/${acceptedApplicantId}`);
    } else {
      onComplete();
    }
  };

  const handleStepAction = async (stepIndex: number) => {
    const step = steps[stepIndex];
    setStepError(null);
    
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
          setStepError(result.error || t('proposals.error.createEscrow'));
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error) {
        setStepError(error instanceof Error ? error.message : t('proposals.error.createEscrow'));
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'fund') {
      if (!escrowId) {
        setStepError(t('escrow.error.noContractBeforeFund'));
        updateStepStatus(stepIndex, 'error');
        return;
      }
      
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onFundEscrow(escrowId);
        const fundTx = result.txHash?.trim();
        if (result.success && fundTx) {
          updateStepStatus(stepIndex, 'completed');

          updateStepStatus(3, 'in_progress');

          try {
            const selectResult = await onSelectWorker(escrowId, fundTx);
            if (selectResult.success) {
              updateStepStatus(3, 'completed');
              setCurrentStep(3);
            } else {
              updateStepStatus(stepIndex, 'error');
              updateStepStatus(3, 'error');
              setStepError(selectResult.error || t('proposals.error.selectWorker'));
            }
          } catch (selectError) {
            updateStepStatus(stepIndex, 'error');
            updateStepStatus(3, 'error');
            setStepError(
              selectError instanceof Error ? selectError.message : t('proposals.error.selectWorker'),
            );
          }
        } else {
          setStepError(result.error || t('proposals.error.fundEscrow'));
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error) {
        setStepError(error instanceof Error ? error.message : t('proposals.error.fundEscrowGeneric'));
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'complete') {
      const fundStep = steps.find((s) => s.id === 'fund');
      if (fundStep?.status !== 'completed') {
        setStepError(t('proposals.error.superviseRequiresFunding'));
        return;
      }
      updateStepStatus(stepIndex, 'completed');
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


  if (!isOpen) return null;

  return (
    <div className="escrow-process-popup">
      <div className="escrow-process-content">
        {/* Header */}
        <div className="escrow-process-header">
          <h2 className="escrow-process-title">
            {t('escrow.popup.title')}
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
            <p><strong>{t('escrow.task.worker')}:</strong> {contributorName}</p>
            <p><strong>{t('escrow.task.address')}:</strong> {contributorAddress.slice(0, 6)}...{contributorAddress.slice(-4)}</p>
            <p><strong>{t('escrow.task.amount')}:</strong> {taskPrice} USDC</p>
            <p className="escrow-task-xlm-note">
              <strong>{t('escrow.task.xlm.note')}</strong>
            </p>
          </div>
        </div>

        {stepError && (
          <div className="escrow-step-error-banner" role="alert">
            {stepError}
          </div>
        )}

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
              </div>
            </div>
          ))}
        </div>

        {/* Progress Indicator */}
        <div className="escrow-progress">
          <div className="escrow-progress-header">
            <span>{t('common.progress')}</span>
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
          <p><strong>{t('common.nota')}</strong> {t('escrow.popup.note.twoTx')}</p>
          <p>1. {t('escrow.popup.step1.create')}</p>
          <p>2. {t('escrow.popup.step2.fund')}</p>
          <div className="escrow-breakdown-box">
            <p className="escrow-breakdown-title">{t('escrow.popup.breakdown')}</p>
            <div className="escrow-breakdown-rows">
              <div className="escrow-breakdown-row">
                <span>{t('deals.wizard.beneficiaryReceives')}</span>
                <strong>{formattedWorkerAmount} USDC</strong>
              </div>
              <EscrowFeeBreakdown
                layout="escrow-rows"
                platformFee={platformFee}
                totalUsdc={formattedCommission}
                variant="employer-bilateral"
              />
            </div>
            <div className="escrow-breakdown-total">
              <div className="escrow-breakdown-total-row">
                <span className="escrow-breakdown-total-label">
                  <FaDollarSign /> Total a enviar:
                </span>
                <strong className="escrow-breakdown-total-amount">{formattedTotal} USDC</strong>
              </div>
              <p className="escrow-breakdown-fee-note">+ fees de XLM (~0.0001 XLM)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Popup de Éxito */}
      {showSuccessPopup && (
        <div className="complete-popup-success-overlay">
          <div className="complete-popup-success-card">
            <h3 className="complete-popup-success-title">{t('escrow.success.full.title')}</h3>

            <div className="complete-popup-success-body">
              <p className="complete-popup-success-lead">{t('escrow.success.subtitle')}</p>

              <div className="complete-popup-success-summary">
                <div className="complete-popup-success-summary-row">
                  <strong>{t('escrow.success.contract.created')}</strong>
                </div>
                <div className="complete-popup-success-summary-row">
                  <strong>{t('escrow.success.funds.sent')}</strong>
                </div>
                <div className="complete-popup-success-summary-row">
                  <strong>{t('escrow.success.worker.selected')}</strong>
                </div>
                {escrowId && (
                  <div className="complete-popup-success-tx">
                    <p className="dispute-muted-text" style={{ margin: 0, fontSize: '0.8125rem' }}>
                      <strong className="dispute-accent-text">{t('escrow.success.contract')}:</strong>{' '}
                      <code className="arcusx-code-chip">
                        {escrowId.slice(0, 8)}...{escrowId.slice(-8)}
                      </code>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="complete-popup-success-actions">
              <button type="button" onClick={handleGoToSupervise} className="complete-popup-btn-primary">
                {t('escrow.supervise.task')}
              </button>
              <button type="button" onClick={handleSuccessPopupClose} className="complete-popup-btn-secondary">
                <FaHome style={{ marginRight: '8px' }} /> {t('proposals.dashboard.button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscrowProcessPopup;
