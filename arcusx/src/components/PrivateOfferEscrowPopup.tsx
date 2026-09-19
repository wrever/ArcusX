import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaFileContract,
  FaCoins,
  FaPaperPlane,
  FaCheckCircle,
  FaSpinner,
  FaTimes,
} from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { usePlatformFee } from '../hooks/usePlatformFee';
import { quoteBilateralFromNominal } from '../utils/bilateralFeeModel';
import '../css/PrivateOfferEscrowPopup.css';

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'error';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: StepStatus;
  buttonText: string;
}

interface PrivateOfferEscrowPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  taskTitle: string;
  taskPrice: string;
  workerName: string;
  onCreateEscrow: () => Promise<{
    success: boolean;
    escrowId?: string;
    contractId?: string;
    deployTxHash?: string;
    error?: string;
  }>;
  onFundEscrow: (escrowId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  onSendOffer: (escrowId: string, fundTxHash: string) => Promise<{ success: boolean; error?: string }>;
}

const PrivateOfferEscrowPopup = ({
  isOpen,
  onClose,
  onComplete,
  taskTitle,
  taskPrice,
  workerName,
  onCreateEscrow,
  onFundEscrow,
  onSendOffer,
}: PrivateOfferEscrowPopupProps) => {
  const { t } = useI18n();
  const { platformFee } = usePlatformFee();
  const nominal = parseFloat(taskPrice) || 0;
  const bilateral = nominal > 0 ? quoteBilateralFromNominal(nominal, platformFee) : null;
  const formattedWorkerNet = (bilateral?.workerNet ?? 0).toFixed(2);
  const formattedTotal = (bilateral?.clientTotal ?? bilateral?.fundAmount ?? 0).toFixed(2);

  const [currentStep, setCurrentStep] = useState(0);
  const [escrowId, setEscrowId] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fundTxRef = useRef<string | null>(null);
  const pipelineStartedRef = useRef(false);

  const resolveEscrowId = (result: { escrowId?: string; contractId?: string }) =>
    result.escrowId?.trim() || result.contractId?.trim() || null;

  const buildSteps = (): ProcessStep[] => [
    {
      id: 'create',
      title: t('privateOffer.escrow.step.create.title'),
      description: t('privateOffer.escrow.step.create.description'),
      icon: <FaFileContract />,
      status: 'pending',
      buttonText: t('privateOffer.escrow.step.create.button'),
    },
    {
      id: 'fund',
      title: t('privateOffer.escrow.step.fund.title'),
      description: t('privateOffer.escrow.step.fund.description').replace('{{total}}', formattedTotal),
      icon: <FaCoins />,
      status: 'pending',
      buttonText: t('privateOffer.escrow.step.fund.button'),
    },
    {
      id: 'send',
      title: t('privateOffer.escrow.step.send.title'),
      description: t('privateOffer.escrow.step.send.description').replace('{{name}}', workerName),
      icon: <FaPaperPlane />,
      status: 'pending',
      buttonText: t('privateOffer.escrow.step.send.button'),
    },
  ];

  const [steps, setSteps] = useState<ProcessStep[]>(buildSteps);

  useEffect(() => {
    if (!isOpen) {
      pipelineStartedRef.current = false;
      return;
    }
    setCurrentStep(0);
    setEscrowId(null);
    setStepError(null);
    setShowSuccess(false);
    fundTxRef.current = null;
    pipelineStartedRef.current = false;
    setSteps(buildSteps().map((s) => ({ ...s, status: 'pending' as StepStatus })));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id === 'fund') {
          return {
            ...step,
            description: t('privateOffer.escrow.step.fund.description').replace(
              '{{total}}',
              formattedTotal,
            ),
          };
        }
        if (step.id === 'send') {
          return {
            ...step,
            description: t('privateOffer.escrow.step.send.description').replace(
              '{{name}}',
              workerName,
            ),
          };
        }
        return step;
      }),
    );
  }, [isOpen, formattedTotal, workerName, t]);

  const completedCount = useMemo(
    () => steps.filter((s) => s.status === 'completed').length,
    [steps],
  );

  const progressPct = useMemo(() => {
    if (completedCount > 0) return (completedCount / steps.length) * 100;
    return Math.min(((currentStep + 1) / steps.length) * 100, 100);
  }, [completedCount, currentStep, steps.length]);

  const updateStepStatus = (index: number, status: StepStatus) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, status } : step)));
  };

  const runCreateStep = async (): Promise<string | null> => {
    updateStepStatus(0, 'in_progress');
    setEscrowId(null);
    try {
      const result = await onCreateEscrow();
      const resolvedId = resolveEscrowId(result);
      if (result.success && resolvedId) {
        setEscrowId(resolvedId);
        updateStepStatus(0, 'completed');
        setCurrentStep(1);
        return resolvedId;
      }
      setStepError(result.error || t('privateOffer.escrow.error.create'));
      updateStepStatus(0, 'error');
      return null;
    } catch (e: unknown) {
      setStepError(e instanceof Error ? e.message : t('privateOffer.escrow.error.create'));
      updateStepStatus(0, 'error');
      return null;
    }
  };

  const runFundStep = async (contractId: string): Promise<string | null> => {
    updateStepStatus(1, 'in_progress');
    try {
      const result = await onFundEscrow(contractId);
      const fundTx = result.txHash?.trim();
      if (result.success && fundTx) {
        fundTxRef.current = fundTx;
        updateStepStatus(1, 'completed');
        setCurrentStep(2);
        return fundTx;
      }
      setStepError(result.error || t('privateOffer.escrow.error.fund'));
      updateStepStatus(1, 'error');
      return null;
    } catch (e: unknown) {
      setStepError(e instanceof Error ? e.message : t('privateOffer.escrow.error.fund'));
      updateStepStatus(1, 'error');
      return null;
    }
  };

  const runSendStep = async (contractId: string, fundTx: string): Promise<boolean> => {
    updateStepStatus(2, 'in_progress');
    try {
      const result = await onSendOffer(contractId, fundTx);
      if (result.success) {
        updateStepStatus(2, 'completed');
        setShowSuccess(true);
        return true;
      }
      setStepError(result.error || t('privateOffer.escrow.error.send'));
      updateStepStatus(2, 'error');
      return false;
    } catch (e: unknown) {
      setStepError(e instanceof Error ? e.message : t('privateOffer.escrow.error.send'));
      updateStepStatus(2, 'error');
      return false;
    }
  };

  const runPipeline = async (fromStepIndex: number) => {
    setStepError(null);

    let contractId = escrowId;
    if (fromStepIndex <= 0) {
      contractId = await runCreateStep();
      if (!contractId) return;
    }

    if (fromStepIndex <= 1) {
      if (!contractId) {
        setStepError(t('escrow.error.noContractBeforeFund'));
        updateStepStatus(1, 'error');
        return;
      }
      const fundTx = await runFundStep(contractId);
      if (!fundTx) return;

      await runSendStep(contractId, fundTx);
      return;
    }

    if (fromStepIndex === 2) {
      if (!contractId) {
        setStepError(t('escrow.error.noContractBeforeFund'));
        return;
      }
      const fundTx = fundTxRef.current;
      if (!fundTx) {
        setStepError(t('privateOffer.escrow.error.fundFirst'));
        return;
      }
      await runSendStep(contractId, fundTx);
    }
  };

  const handleStepAction = async (stepIndex: number) => {
    await runPipeline(stepIndex);
  };

  useEffect(() => {
    if (!isOpen || pipelineStartedRef.current) return;
    pipelineStartedRef.current = true;
    void runPipeline(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir el popup
  }, [isOpen]);

  const getStepIcon = (step: ProcessStep) => {
    if (step.status === 'in_progress') return <FaSpinner className="animate-spin" />;
    if (step.status === 'completed') return <FaCheckCircle />;
    if (step.status === 'error') return <FaTimes />;
    return step.icon;
  };

  const stepClass = (status: StepStatus) => {
    if (status === 'in_progress') return 'in_progress';
    return status;
  };

  if (!isOpen) return null;

  return (
    <div className="private-offer-escrow-popup" role="dialog" aria-modal="true">
      <div className="private-offer-escrow-popup__panel">
        <div className="private-offer-escrow-popup__header">
          <h2 className="private-offer-escrow-popup__title">
            {t('privateOffer.escrow.popup.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="private-offer-escrow-popup__close"
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="private-offer-escrow-popup__summary">
          <h3>{taskTitle}</h3>
          <p>
            <strong>{t('privateOffer.escrow.worker')}:</strong> {workerName}
          </p>
          {bilateral ? (
            <>
              <p>
                <strong>{t('create.worker.receives')}</strong> {formattedWorkerNet} USDC
              </p>
              <p>
                <strong>{t('privateOffer.escrow.total')}:</strong> {formattedTotal} USDC
              </p>
            </>
          ) : null}
        </div>

        {stepError ? (
          <div className="private-offer-escrow-popup__error" role="alert">
            {stepError}
          </div>
        ) : null}

        <div className="private-offer-escrow-popup__steps">
          {steps.map((step, index) => {
            const canAct =
              index === currentStep &&
              step.status !== 'completed' &&
              (index === 0 || steps[index - 1]?.status === 'completed');

            return (
              <div
                key={step.id}
                className={`private-offer-escrow-step ${stepClass(step.status)}`}
              >
                <div className="private-offer-escrow-step__row">
                  <div className="private-offer-escrow-step__info">
                    <div className="private-offer-escrow-step__icon">{getStepIcon(step)}</div>
                    <div className="private-offer-escrow-step__text">
                      <h4>{step.title}</h4>
                      <p>{step.description}</p>
                    </div>
                  </div>
                  <div className="private-offer-escrow-step__action">
                    {canAct && step.status === 'pending' && (
                      <button
                        type="button"
                        className="private-offer-escrow-step__btn"
                        onClick={() => handleStepAction(index)}
                      >
                        {step.buttonText}
                      </button>
                    )}
                    {step.status === 'in_progress' && (
                      <span className="private-offer-escrow-step__status">
                        {t('escrow.status.processing')}
                      </span>
                    )}
                    {step.status === 'completed' && (
                      <span className="private-offer-escrow-step__status">
                        {t('escrow.status.completed')}
                      </span>
                    )}
                    {step.status === 'error' && (
                      <button
                        type="button"
                        className="private-offer-escrow-step__btn private-offer-escrow-step__btn--danger"
                        onClick={() => handleStepAction(index)}
                      >
                        {t('escrow.retry')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="private-offer-escrow-popup__progress">
          <div className="private-offer-escrow-popup__progress-head">
            <span>{t('common.progress')}</span>
            <span>
              {completedCount > 0 ? completedCount : Math.min(currentStep + 1, steps.length)} /{' '}
              {steps.length}
            </span>
          </div>
          <div className="private-offer-escrow-popup__progress-bar">
            <div
              className="private-offer-escrow-popup__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {showSuccess ? (
          <div className="private-offer-escrow-popup__success">
            <FaCheckCircle />
            <p>{t('privateOffer.escrow.success.message').replace('{{name}}', workerName)}</p>
            <button
              type="button"
              className="private-offer-escrow-step__btn"
              onClick={() => {
                onClose();
                onComplete();
              }}
            >
              {t('privateOffer.escrow.success.done')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PrivateOfferEscrowPopup;
