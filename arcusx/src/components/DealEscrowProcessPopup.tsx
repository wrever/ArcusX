import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaWallet, FaFileContract, FaCoins, FaCheckCircle, FaSpinner, FaTimes, FaDollarSign } from 'react-icons/fa';
import { usePlatformFee } from '../hooks/usePlatformFee';
import { useI18n } from '../i18n/I18nProvider';
import type { AgreementDeal } from '../services/dealsService';
import { dealBeneficiaryNet, dealDepositAmount, dealPlatformFeeRate } from '../utils/dealHelpers';
import { quoteBilateralFromNominal } from '../utils/bilateralFeeModel';
import EscrowFeeBreakdown from './EscrowFeeBreakdown';
import '../css/ProposalReview.css';

export type DealEscrowFlowMode = 'deploy_only' | 'fund_only' | 'deploy_and_fund';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  buttonText?: string;
}

export interface DealEscrowProcessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  mode: DealEscrowFlowMode;
  deal: AgreementDeal;
  isWalletConnected: boolean;
  onConnectWallet: () => Promise<{ success: boolean; error?: string }>;
  onDeploy?: () => Promise<{ success: boolean; escrowId?: string; contractId?: string; error?: string }>;
  onFund: (escrowId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  initialEscrowId?: string | null;
  chainAlreadyFunded?: boolean;
}

const DealEscrowProcessPopup: React.FC<DealEscrowProcessPopupProps> = ({
  isOpen,
  onClose,
  onComplete,
  mode,
  deal,
  isWalletConnected,
  onConnectWallet,
  onDeploy,
  onFund,
  initialEscrowId,
  chainAlreadyFunded = false,
}) => {
  const { t } = useI18n();
  const { platformFee: livePlatformFee } = usePlatformFee();
  const dealFee = dealPlatformFeeRate(deal);

  const nominal = parseFloat(String(deal.amount_usdc)) || 0;
  const bilateral = nominal > 0 ? quoteBilateralFromNominal(nominal, dealFee) : null;
  const workerAmount = bilateral?.workerNet ?? dealBeneficiaryNet(deal);
  const escrowAmount = bilateral?.fundAmount ?? dealDepositAmount(deal);
  const commission = bilateral?.clientVisibleFee ?? 0;
  const formattedWorkerAmount = workerAmount.toFixed(7);
  const formattedCommission = commission.toFixed(7);
  const formattedTotal = escrowAmount.toFixed(7);

  const stepDefs = useMemo((): ProcessStep[] => {
    const connect: ProcessStep = {
      id: 'connect',
      title: t('escrow.step.connect.title'),
      description: t('escrow.step.connect.description'),
      icon: <FaWallet />,
      status: 'pending',
      buttonText: t('escrow.step.connect.button'),
    };
    const create: ProcessStep = {
      id: 'create',
      title: t('deals.escrow.step.create.title'),
      description: t('deals.escrow.step.create.description'),
      icon: <FaFileContract />,
      status: 'pending',
      buttonText: t('deals.escrow.step.create.button'),
    };
    const fund: ProcessStep = {
      id: 'fund',
      title: t('deals.escrow.step.fund.title'),
      description: t('deals.escrow.step.fund.description').replace('{{total}}', formattedTotal),
      icon: <FaCoins />,
      status: 'pending',
      buttonText: t('deals.escrow.step.fund.button'),
    };
    const done: ProcessStep = {
      id: 'done',
      title: t('deals.escrow.step.done.title'),
      description: t('deals.escrow.step.done.description'),
      icon: <FaCheckCircle />,
      status: 'pending',
      buttonText: t('deals.escrow.step.done.button'),
    };

    if (mode === 'deploy_only') return [connect, create, done];
    if (mode === 'fund_only') return [connect, fund, done];
    return [connect, create, fund, done];
  }, [mode, t, formattedTotal]);

  const [steps, setSteps] = useState<ProcessStep[]>(stepDefs);
  const [currentStep, setCurrentStep] = useState(0);
  const [escrowId, setEscrowId] = useState<string | null>(initialEscrowId ?? deal.escrow_contract_id ?? null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const pipelineStartedRef = useRef(false);

  const resolveEscrowId = (result: { escrowId?: string; contractId?: string }) =>
    result.escrowId?.trim() || result.contractId?.trim() || null;

  useEffect(() => {
    setSteps(stepDefs);
  }, [stepDefs]);

  useEffect(() => {
    if (!isOpen) return;
    setActionError(null);
    setShowSuccess(false);
    const id = initialEscrowId ?? deal.escrow_contract_id ?? null;
    setEscrowId(id);

    const next: ProcessStep[] = stepDefs.map((s) => ({ ...s, status: 'pending' }));
    let idx = 0;

    if (isWalletConnected) {
      const c = next.findIndex((s) => s.id === 'connect');
      if (c >= 0) {
        next[c] = { ...next[c], status: 'completed' };
        idx = c + 1;
      }
    }
    if (id && mode !== 'fund_only') {
      const cr = next.findIndex((s) => s.id === 'create');
      if (cr >= 0) {
        next[cr] = { ...next[cr], status: 'completed' };
        idx = Math.max(idx, cr + 1);
      }
    }
    if (chainAlreadyFunded || deal.status === 'funded' || deal.status === 'active') {
      const f = next.findIndex((s) => s.id === 'fund');
      if (f >= 0) {
        next[f] = { ...next[f], status: 'completed' };
        idx = Math.max(idx, f + 1);
      }
    }

    setSteps(next);
    setCurrentStep(Math.min(idx, next.length - 1));
  }, [isOpen, isWalletConnected, initialEscrowId, deal.escrow_contract_id, deal.status, chainAlreadyFunded, mode, stepDefs]);

  const updateStepStatus = (stepIndex: number, status: ProcessStep['status']) => {
    setSteps((prev) => prev.map((step, index) => (index === stepIndex ? { ...step, status } : step)));
  };

  const runConnectStep = async (stepIndex: number): Promise<boolean> => {
    updateStepStatus(stepIndex, 'in_progress');
    try {
      const result = await onConnectWallet();
      if (result.success) {
        updateStepStatus(stepIndex, 'completed');
        setCurrentStep(stepIndex + 1);
        return true;
      }
      updateStepStatus(stepIndex, 'error');
      setActionError(result.error ?? t('deals.error.generic'));
      return false;
    } catch {
      updateStepStatus(stepIndex, 'error');
      return false;
    }
  };

  const runCreateStep = async (stepIndex: number): Promise<string | null> => {
    if (!onDeploy) return null;
    updateStepStatus(stepIndex, 'in_progress');
    try {
      const result = await onDeploy();
      const cid = resolveEscrowId(result);
      if (result.success && cid) {
        setEscrowId(cid);
        updateStepStatus(stepIndex, 'completed');
        setCurrentStep(stepIndex + 1);
        return cid;
      }
      updateStepStatus(stepIndex, 'error');
      setActionError(result.error ?? t('deals.error.generic'));
      return null;
    } catch (e: unknown) {
      updateStepStatus(stepIndex, 'error');
      setActionError(e instanceof Error ? e.message : t('deals.error.generic'));
      return null;
    }
  };

  const runFundStep = async (stepIndex: number, contractId: string): Promise<boolean> => {
    updateStepStatus(stepIndex, 'in_progress');
    try {
      const result = await onFund(contractId);
      if (result.success) {
        updateStepStatus(stepIndex, 'completed');
        setCurrentStep(stepIndex + 1);
        return true;
      }
      updateStepStatus(stepIndex, 'error');
      setActionError(result.error ?? t('deals.error.generic'));
      return false;
    } catch (e: unknown) {
      updateStepStatus(stepIndex, 'error');
      setActionError(e instanceof Error ? e.message : t('deals.error.generic'));
      return false;
    }
  };

  const runPipeline = async (fromStepIndex: number) => {
    setActionError(null);
    const connectIdx = steps.findIndex((s) => s.id === 'connect');
    const createIdx = steps.findIndex((s) => s.id === 'create');
    const fundIdx = steps.findIndex((s) => s.id === 'fund');
    const doneIdx = steps.findIndex((s) => s.id === 'done');

    if (fromStepIndex <= connectIdx && connectIdx >= 0 && !isWalletConnected) {
      const ok = await runConnectStep(connectIdx);
      if (!ok) return;
    }

    let contractId = escrowId ?? deal.escrow_contract_id ?? null;
    if (fromStepIndex <= createIdx && createIdx >= 0 && mode !== 'fund_only') {
      if (!contractId) {
        contractId = await runCreateStep(createIdx);
        if (!contractId) return;
      }
    }

    if (fromStepIndex <= fundIdx && fundIdx >= 0) {
      if (!contractId) {
        setActionError(t('deals.workspace.waitingBuyerContract'));
        if (fundIdx >= 0) updateStepStatus(fundIdx, 'error');
        return;
      }
      const funded = await runFundStep(fundIdx, contractId);
      if (!funded) return;
    }

    if (doneIdx >= 0) {
      updateStepStatus(doneIdx, 'completed');
      setShowSuccess(true);
    }
  };

  const handleStepAction = async (stepIndex: number) => {
    const step = steps[stepIndex];
    if (step.id === 'done') {
      updateStepStatus(stepIndex, 'completed');
      setShowSuccess(true);
      return;
    }
    await runPipeline(stepIndex);
  };

  useEffect(() => {
    if (!isOpen) {
      pipelineStartedRef.current = false;
      return;
    }
    if (mode !== 'deploy_and_fund' || pipelineStartedRef.current) return;
    if (!isWalletConnected) return;
    pipelineStartedRef.current = true;
    void runPipeline(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir con wallet conectada
  }, [isOpen, mode, isWalletConnected]);

  const getStepIcon = (step: ProcessStep) => {
    if (step.status === 'in_progress') return <FaSpinner className="animate-spin" />;
    if (step.status === 'completed') return <FaCheckCircle className="icon-success" />;
    if (step.status === 'error') return <FaTimes className="icon-error" />;
    return step.icon;
  };

  if (!isOpen) return null;

  return (
    <div className="escrow-process-popup">
      <div className="escrow-process-content">
        <div className="escrow-process-header">
          <h2 className="escrow-process-title">{t('deals.escrow.popup.title')}</h2>
          <button type="button" onClick={onClose} className="escrow-process-close" aria-label={t('common.close')}>
            <FaTimes />
          </button>
        </div>

        <div className="escrow-task-info">
          <h3>{deal.title}</h3>
          <div className="escrow-task-details">
            <p>
              <strong>{t('deals.wizard.protected')}:</strong> {formattedWorkerAmount} USDC
            </p>
            <p>
              <strong>{t('deals.wizard.totalDeposit')}:</strong> {formattedTotal} USDC
            </p>
            {escrowId && (
              <p>
                <strong>{t('complete.popup.label.contractId')}:</strong>{' '}
                {escrowId.slice(0, 8)}…{escrowId.slice(-8)}
              </p>
            )}
          </div>
        </div>

        {actionError && (
          <p className="deals-error" role="alert" style={{ margin: '0 1rem' }}>
            {actionError}
          </p>
        )}

        <div className="escrow-steps">
          {steps.map((step, index) => (
            <div key={step.id} className={`escrow-step ${step.status}`}>
              <div className="escrow-step-content">
                <div className="escrow-step-info">
                  <div className="escrow-step-icon">{getStepIcon(step)}</div>
                  <div className="escrow-step-text">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
                <div className="escrow-step-action">
                  {step.buttonText && step.status === 'pending' && index === currentStep && (
                    <button type="button" onClick={() => void handleStepAction(index)} className="escrow-step-button">
                      {step.buttonText}
                    </button>
                  )}
                  {step.status === 'in_progress' && (
                    <div className="escrow-step-status">{t('escrow.status.processing')}</div>
                  )}
                  {step.status === 'completed' && (
                    <div className="escrow-step-status">{t('escrow.status.completed')}</div>
                  )}
                  {step.status === 'error' && (
                    <button type="button" onClick={() => void handleStepAction(index)} className="escrow-step-button error">
                      {t('escrow.retry')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="escrow-process-note">
          <div className="escrow-breakdown-box">
            <p className="escrow-breakdown-title">{t('escrow.popup.breakdown')}</p>
            <div className="escrow-breakdown-rows">
              <div className="escrow-breakdown-row">
                <span>{t('deals.wizard.beneficiaryReceives')}</span>
                <strong>{formattedWorkerAmount} USDC</strong>
              </div>
              <EscrowFeeBreakdown
                layout="escrow-rows"
                platformFee={dealFee || livePlatformFee}
                totalUsdc={formattedCommission}
                variant="employer-bilateral"
              />
            </div>
            <div className="escrow-breakdown-total">
              <div className="escrow-breakdown-total-row">
                <span className="escrow-breakdown-total-label">
                  <FaDollarSign /> {t('deals.escrow.totalToFund')}
                </span>
                <strong className="escrow-breakdown-total-amount">{formattedTotal} USDC</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="complete-popup-success-overlay">
          <div className="complete-popup-success-card">
            <FaCheckCircle className="icon-success" style={{ fontSize: 48, marginBottom: 16 }} />
            <h3 className="complete-popup-success-title">{t('deals.escrow.success.title')}</h3>
            <p className="complete-popup-success-lead">{t('deals.escrow.success.description')}</p>
            <button
              type="button"
              className="complete-popup-btn-primary"
              style={{ marginTop: 24 }}
              onClick={() => {
                setShowSuccess(false);
                onClose();
                onComplete();
              }}
            >
              {t('deals.escrow.step.done.button')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealEscrowProcessPopup;
