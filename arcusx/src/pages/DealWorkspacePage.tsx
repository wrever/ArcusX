import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FaFlag, FaHandshake, FaTimes } from 'react-icons/fa';
import {
  useApproveMilestone,
  useReleaseFunds,
  useSendTransaction,
  useInitializeEscrow,
  useFundEscrow,
  useGetEscrowFromIndexerByContractIds,
  useStartDispute,
} from '@trustless-work/escrow';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useDealEscrowChainState } from '../hooks/useDealEscrowChainState';
import {
  approveMilestoneTrustlessEscrow,
  releaseFundsTrustlessEscrow,
  startDisputeTrustlessEscrow,
} from '../services/trustlessWorkEscrowService';
import {
  completeDeal,
  createDealDispute,
  finalizeDealEscrow,
  getDealDetails,
  markDealReleased,
  type AgreementDeal,
} from '../services/dealsService';
import {
  createAndFundDealEscrow,
  deployDealEscrow,
  fundDealEscrow,
  deploySignerWallet,
  funderWallet,
  isCommerceFunderDeal,
  releaseSignerWallet,
  type DealEscrowHooks,
} from '../services/dealEscrow';
import { dealBeneficiaryNet, dealPlatformFeeRate, dealRatedUserId, isDealBeneficiaryViewer } from '../utils/dealHelpers';
import { quoteBilateralFromNominal } from '../utils/bilateralFeeModel';
import EscrowFeeBreakdown from '../components/EscrowFeeBreakdown';
import { devError } from '../utils/logger';
import {
  assertClientCanSignEscrowAction,
  fetchDealEscrowFromIndexer,
  isDealMilestoneApproved,
  resolveEscrowApprover,
  resolveEscrowReleaseSigner,
} from '../utils/dealEscrowVerification';
import DealEscrowProcessPopup, { type DealEscrowFlowMode } from '../components/DealEscrowProcessPopup';
import CompleteTaskPopup from '../components/CompleteTaskPopup';
import DealEvidencePanel from '../components/DealEvidencePanel';
import PrivateOfferWalletModal from '../components/PrivateOfferWalletModal';
import { usePayoutWallet } from '../hooks/usePayoutWallet';
import '../css/DealsPages.css';

const DealWorkspacePage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const { address, isConnected, connectWallet, kit } = useWallet();
  const { approveMilestone } = useApproveMilestone();
  const { releaseFunds } = useReleaseFunds();
  const { sendTransaction } = useSendTransaction();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  const getEscrowRef = useRef(getEscrowByContractIds);
  getEscrowRef.current = getEscrowByContractIds;
  const { startDispute } = useStartDispute();
  const [deal, setDeal] = useState<AgreementDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [escrowPopupOpen, setEscrowPopupOpen] = useState(false);
  const [completePopupOpen, setCompletePopupOpen] = useState(false);
  const [showWalletGate, setShowWalletGate] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [creatingDispute, setCreatingDispute] = useState(false);
  const { registered: payoutRegistered, refresh: refreshPayoutWallet } = usePayoutWallet();

  const userId = user?.id != null ? Number(user.id) : null;

  useEffect(() => {
    if (!userId) return;
    void refreshPayoutWallet().then(({ registered }) => {
      if (!registered) setShowWalletGate(true);
    });
  }, [userId, refreshPayoutWallet]);

  const requirePayoutWallet = () => {
    if (!payoutRegistered) {
      setShowWalletGate(true);
      return false;
    }
    return true;
  };

  const load = () => {
    if (!id) return;
    setLoading(true);
    getDealDetails(id)
      .then((r) => setDeal(r.deal))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!deal?.id || deal.status !== 'funded') return;
    completeDeal(deal.id)
      .then(() => load())
      .catch(() => {
        /* idempotente: si ya está active, ignorar */
      });
  }, [deal?.id, deal?.status]);

  const escrowHooks: DealEscrowHooks = useMemo(
    () => ({
      kit,
      deployEscrow: deployEscrow as DealEscrowHooks['deployEscrow'],
      fundEscrow: fundEscrow as DealEscrowHooks['fundEscrow'],
      sendTransaction: sendTransaction as DealEscrowHooks['sendTransaction'],
      getEscrowByContractIds: async (contractIds) => {
        const ids = Array.isArray(contractIds) ? contractIds : contractIds.contractIds;
        const result = await getEscrowRef.current({
          contractIds: ids,
          validateOnChain: Array.isArray(contractIds) ? false : contractIds.validateOnChain ?? false,
        });
        return Array.isArray(result) ? result : (result as { escrows?: unknown[] })?.escrows ?? result ?? [];
      },
    }),
    [kit, deployEscrow, fundEscrow, sendTransaction],
  );

  const chain = useDealEscrowChainState(deal, escrowHooks.getEscrowByContractIds);

  useEffect(() => {
    if (!deal?.id || !address || !chain.funded) return;
    if (deal.status !== 'accepted') return;
    if (!deal.escrow_contract_id || address !== funderWallet(deal)) return;

    let cancelled = false;
    finalizeDealEscrow({
      agreement_id: deal.id,
      escrow_id: deal.escrow_contract_id,
      wallet_address: address,
    })
      .then(() => completeDeal(deal.id).catch(() => {}))
      .then(() => {
        if (!cancelled) load();
      })
      .catch((e: unknown) => devError('deal escrow reconcile failed', e));

    return () => {
      cancelled = true;
    };
  }, [deal?.id, deal?.status, deal?.escrow_contract_id, chain.funded, address]);

  const isReleaseSigner = deal && address && address === releaseSignerWallet(deal);
  const isPayer = deal && address && address === funderWallet(deal);
  const isDeployer = deal && address && address === deploySignerWallet(deal);
  const commerce = deal ? isCommerceFunderDeal(deal) : false;

  const isCreator = userId != null && deal?.initiator_user_id === userId;
  const isParticipant =
    userId != null &&
    deal != null &&
    (deal.initiator_user_id === userId || deal.counterparty_user_id === userId);
  const canDispute =
    Boolean(deal?.escrow_contract_id) &&
    chain.funded &&
    !chain.released &&
    isParticipant &&
    ['funded', 'active', 'disputed'].includes(String(deal?.status ?? ''));
  const canUploadEvidence =
    isParticipant && deal != null && !['cancelled', 'completed'].includes(deal.status);

  const needsCommerceEscrow =
    deal &&
    commerce &&
    isPayer &&
    isDeployer &&
    deal.status === 'accepted' &&
    !chain.funded &&
    !chain.released;

  const needsFund =
    deal &&
    isPayer &&
    deal.status === 'accepted' &&
    Boolean(deal.escrow_contract_id) &&
    !chain.funded &&
    !chain.released;

  const needsFreelancerEscrow =
    deal &&
    !commerce &&
    isPayer &&
    deal.status === 'accepted' &&
    !chain.funded &&
    !chain.released;

  const needsRelease =
    deal &&
    deal.escrow_contract_id &&
    isReleaseSigner &&
    chain.funded &&
    !chain.released &&
    deal.status !== 'completed';

  const escrowFlowMode: DealEscrowFlowMode | null = useMemo(() => {
    if (needsCommerceEscrow && !deal?.escrow_contract_id) return 'deploy_and_fund';
    if (needsFund) return 'fund_only';
    if (needsFreelancerEscrow) return 'deploy_and_fund';
    return null;
  }, [needsCommerceEscrow, needsFund, needsFreelancerEscrow, deal?.escrow_contract_id]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (!deal || loading) return;
    if (action === 'escrow' && escrowFlowMode) {
      setEscrowPopupOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
    if (action === 'release' && needsRelease) {
      setCompletePopupOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [deal, loading, escrowFlowMode, needsRelease, searchParams, setSearchParams]);

  const ratedUserId = deal && userId != null ? dealRatedUserId(deal, userId) : null;

  const handleFund = async (contractId: string) => {
    if (!deal || !address) return { success: false, error: t('deals.error.generic') };
    const fresh = await getDealDetails(deal.id);
    if (!fresh.deal.escrow_contract_id) {
      const combined = await createAndFundDealEscrow({
        deal: fresh.deal,
        funderAddress: address,
        hooks: escrowHooks,
      });
      return {
        success: combined.success,
        txHash: undefined,
        error: combined.error,
        escrowId: combined.contractId,
      };
    }
    const result = await fundDealEscrow({
      deal: { ...fresh.deal, escrow_contract_id: contractId },
      funderAddress: address,
      hooks: escrowHooks,
    });
    return {
      success: result.success,
      error: result.error,
      escrowId: result.contractId,
    };
  };

  const onDeployForPopup = async () => {
    if (!deal || !address) return { success: false, error: t('deals.error.generic') };
    const fresh = await getDealDetails(deal.id);
    if (fresh.deal.escrow_contract_id) {
      return { success: true, escrowId: fresh.deal.escrow_contract_id };
    }
    const result = await deployDealEscrow({
      deal: fresh.deal,
      signerAddress: address,
      hooks: escrowHooks,
    });
    return { success: result.success, error: result.error, escrowId: result.contractId };
  };

  const handleApproveMilestone = async () => {
    if (!deal?.escrow_contract_id || !address || !kit) {
      throw new Error(t('deals.error.generic'));
    }
    const indexerWrapper = async (ids: string[]) => {
      const rows = await escrowHooks.getEscrowByContractIds(ids);
      return Array.isArray(rows) ? rows : [];
    };
    const row = await fetchDealEscrowFromIndexer(
      deal.escrow_contract_id,
      escrowHooks.getEscrowByContractIds,
    );
    const approver = resolveEscrowApprover(row, address);
    assertClientCanSignEscrowAction(approver, address, 'aprobar milestone');
    return approveMilestoneTrustlessEscrow(
      deal.escrow_contract_id,
      '0',
      approver,
      kit,
      approveMilestone,
      sendTransaction,
      indexerWrapper,
    );
  };

  const handleReleaseFunds = async () => {
    if (!deal?.escrow_contract_id || !address || !kit) {
      throw new Error(t('deals.error.generic'));
    }
    const indexerWrapper = async (ids: string[]) => {
      const rows = await escrowHooks.getEscrowByContractIds(ids);
      return Array.isArray(rows) ? rows : [];
    };
    const row = await fetchDealEscrowFromIndexer(
      deal.escrow_contract_id,
      escrowHooks.getEscrowByContractIds,
    );
    const releaseSigner = resolveEscrowReleaseSigner(row, address);
    assertClientCanSignEscrowAction(releaseSigner, address, 'liberar fondos');
    return releaseFundsTrustlessEscrow(
      deal.escrow_contract_id,
      releaseSigner,
      kit,
      releaseFunds,
      sendTransaction,
      indexerWrapper,
    );
  };

  const handleVerifyMilestone = async (): Promise<boolean> => {
    if (!deal?.escrow_contract_id) return false;
    const row = await fetchDealEscrowFromIndexer(
      deal.escrow_contract_id,
      escrowHooks.getEscrowByContractIds,
    );
    return isDealMilestoneApproved(row);
  };

  const handleCreateDispute = async () => {
    if (!deal?.id || !deal.escrow_contract_id) return;
    const reason = disputeReason.trim();
    if (reason.length < 10) {
      setError(t('deals.dispute.reasonMin'));
      return;
    }
    if (!isConnected || !address || !kit) {
      setError(t('deals.dispute.connectWallet'));
      return;
    }
    if (deal.status === 'disputed') {
      setError(t('deals.dispute.alreadyOpen'));
      return;
    }
    setCreatingDispute(true);
    setError('');
    try {
      const tw = await startDisputeTrustlessEscrow(
        deal.escrow_contract_id,
        address,
        kit,
        startDispute,
        sendTransaction,
      );
      if (!tw.success) throw new Error(tw.error || t('deals.dispute.failed'));
      await createDealDispute({
        agreement_id: deal.id,
        reason,
        tx_hash: tw.txHash,
      });
      setShowDisputeModal(false);
      setDisputeReason('');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.dispute.failed'));
    } finally {
      setCreatingDispute(false);
    }
  };

  const commerceStepClass = (step: 1 | 2 | 3 | 4) => {
    if (!deal) return '';
    if (step === 1) {
      if (deal.status !== 'sent') return 'is-done';
      return 'is-current';
    }
    if (step === 2) {
      if (['accepted', 'funded', 'active', 'completed'].includes(deal.status)) return 'is-done';
      if (deal.status === 'sent') return 'is-current';
      return '';
    }
    if (step === 3) {
      if (deal.escrow_contract_id || chain.contractOnChain) return 'is-done';
      if (deal.status === 'accepted') return 'is-current';
      return '';
    }
    if (step === 4) {
      if (chain.funded || deal.status === 'completed' || chain.released) return 'is-done';
      if (deal.escrow_contract_id && !chain.funded) return 'is-current';
      return '';
    }
    return '';
  };

  return (
    <div className="deals-page deals-page--wide">
      <Link to="/dashboard?tab=deals" className="deals-btn secondary" style={{ marginBottom: '1rem', display: 'inline-block' }}>
        {t('deals.back')}
      </Link>
      <h1><FaHandshake /> {t('deals.workspace.title')}</h1>
      <p className="deals-lead">{t('deals.workspace.lead')}</p>

      {loading && <p>{t('deals.loading')}</p>}
      {error && <p className="deals-error" role="alert">{error}</p>}

      {deal && !loading && (
        <div className="deals-form-card">
          <span className={`deals-status-badge ${deal.status}`}>{deal.status}</span>
          <h2 className="deals-form-card__title">{deal.title}</h2>
          <p className="deals-public-desc">{deal.description}</p>
          <div className="deals-summary-row"><span>{t('deals.wizard.dealValue')}</span><strong>{Number(deal.amount_usdc).toFixed(2)} USDC</strong></div>
          {isDealBeneficiaryViewer(deal, address) && (
            <div className="deals-summary-row"><span>{t('deals.wizard.beneficiaryReceives')}</span><strong>{dealBeneficiaryNet(deal).toFixed(2)} USDC</strong></div>
          )}
          {(() => {
            const feeRate = dealPlatformFeeRate(deal);
            const bilateral = quoteBilateralFromNominal(Number(deal.amount_usdc), feeRate);
            return (
              <EscrowFeeBreakdown
                platformFee={feeRate}
                layout="flex-rows"
                totalUsdc={bilateral.clientVisibleFee.toFixed(2)}
                variant="employer-bilateral"
                className="deals-fee-breakdown"
              />
            );
          })()}
          <div className="deals-summary-row"><span>{t('deals.wizard.totalDeposit')}</span><strong>{Number(deal.client_total).toFixed(2)} USDC</strong></div>
          {deal.escrow_contract_id && (
            <div className="deals-summary-row"><span>Escrow</span><code>{deal.escrow_contract_id.slice(0, 12)}…</code></div>
          )}
          <p className="deals-disclaimer">
            {t('deals.workspace.payer')}: <code>{funderWallet(deal).slice(0, 8)}…</code>
            {' · '}
            {commerce ? t('deals.workspace.releaserBuyer') : t('deals.workspace.releaser')}:{' '}
            <code>{releaseSignerWallet(deal).slice(0, 8)}…</code>
          </p>

          {commerce && (
            <ol className="deals-commerce-steps deals-commerce-steps--compact">
              <li className={commerceStepClass(1)}>{t('deals.commerce.step1')}</li>
              <li className={commerceStepClass(2)}>{t('deals.commerce.step2')}</li>
              <li className={commerceStepClass(3)}>{t('deals.commerce.step3')}</li>
              <li className={commerceStepClass(4)}>{t('deals.commerce.step4')}</li>
            </ol>
          )}

          {escrowFlowMode && (
            <button
              type="button"
              className="deals-btn primary"
              onClick={() => {
                if (!requirePayoutWallet()) return;
                setEscrowPopupOpen(true);
              }}
            >
              {t('deals.workspace.payEscrow')}
            </button>
          )}

          {needsRelease && (
            <button
              type="button"
              className="deals-btn primary"
              style={{ marginTop: escrowFlowMode ? '0.75rem' : 0 }}
              onClick={() => {
                if (!requirePayoutWallet()) return;
                setCompletePopupOpen(true);
              }}
            >
              {t('deals.workspace.completeDeal')}
            </button>
          )}

          {commerce && isCreator && deal.status === 'accepted' && !deal.escrow_contract_id && (
            <p className="deals-disclaimer">{t('deals.workspace.waitingBuyerContract')}</p>
          )}

          {commerce && isCreator && deal.escrow_contract_id && !chain.funded && (
            <p className="deals-disclaimer">{t('deals.workspace.waitingFund')}</p>
          )}

          {deal.status === 'completed' && (
            <p className="deals-workspace-done">{t('deals.workspace.completed')}</p>
          )}

          {deal.status === 'disputed' && (
            <p className="deals-disclaimer" style={{ marginTop: '1rem' }}>
              {t('deals.dispute.openMessage')}
            </p>
          )}

          {canDispute && deal.status !== 'disputed' && (
            <button
              type="button"
              className="deals-btn secondary"
              style={{ marginTop: '1rem' }}
              onClick={() => setShowDisputeModal(true)}
            >
              <FaFlag /> {t('deals.dispute.open')}
            </button>
          )}

          <DealEvidencePanel agreementId={deal.id} canUpload={canUploadEvidence} />

          <Link to={`/deal/${deal.deal_token}`} className="deals-btn secondary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            {t('deals.workspace.viewLink')}
          </Link>
        </div>
      )}

      {showDisputeModal && (
        <div className="private-wallet-modal-overlay" role="presentation" onClick={() => setShowDisputeModal(false)}>
          <div
            className="private-wallet-modal"
            role="dialog"
            aria-labelledby="deal-dispute-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="private-wallet-modal-close" onClick={() => setShowDisputeModal(false)} aria-label={t('common.cancel')}>
              <FaTimes />
            </button>
            <h2 id="deal-dispute-title">{t('deals.dispute.modalTitle')}</h2>
            <p>{t('deals.dispute.modalHint')}</p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder={t('deals.dispute.reasonPlaceholder')}
              rows={5}
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <div className="private-wallet-modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDisputeModal(false)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={creatingDispute || disputeReason.trim().length < 10}
                onClick={() => void handleCreateDispute()}
              >
                {creatingDispute ? '…' : t('deals.dispute.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deal && escrowFlowMode && (
        <DealEscrowProcessPopup
          isOpen={escrowPopupOpen}
          onClose={() => setEscrowPopupOpen(false)}
          onComplete={() => {
            setEscrowPopupOpen(false);
            void chain.refresh();
            load();
          }}
          mode={escrowFlowMode}
          deal={deal}
          isWalletConnected={isConnected}
          onConnectWallet={async () => {
            try {
              await connectWallet();
              return { success: true };
            } catch (e: unknown) {
              return {
                success: false,
                error: e instanceof Error ? e.message : t('deals.error.generic'),
              };
            }
          }}
          onDeploy={onDeployForPopup}
          onFund={handleFund}
          initialEscrowId={deal.escrow_contract_id}
          chainAlreadyFunded={chain.funded}
        />
      )}

      {deal && deal.escrow_contract_id && needsRelease && (
        <CompleteTaskPopup
          isOpen={completePopupOpen}
          onClose={() => setCompletePopupOpen(false)}
          onComplete={() => {
            setCompletePopupOpen(false);
            load();
          }}
          onStayOnSupervision={() => load()}
          onGoToDashboard={() => navigate('/dashboard')}
          taskPrice={String(deal.amount_usdc)}
          escrowId={deal.escrow_contract_id}
          clientAddress={releaseSignerWallet(deal)}
          agreementId={deal.id}
          workerId={ratedUserId ?? undefined}
          workerName={commerce ? t('deals.complete.rateSeller') : t('deals.complete.rateCounterparty')}
          popupTitle={t('deals.complete.popup.title')}
          onApproveMilestone={handleApproveMilestone}
          onReleaseFunds={handleReleaseFunds}
          onPersistRelease={async (payload) => {
            try {
              const data = await markDealReleased(deal.id, payload.releaseTxHash, {
                rating: payload.rating,
                rated_user_id: payload.workerId,
              });
              if (data?.success === false) {
                return { success: false, error: data.message || t('deals.error.generic') };
              }
              return { success: true };
            } catch (e: unknown) {
              return {
                success: false,
                error: e instanceof Error ? e.message : t('deals.error.generic'),
              };
            }
          }}
          onVerifyMilestone={handleVerifyMilestone}
          platformFeeOverride={dealPlatformFeeRate(deal)}
        />
      )}

      <PrivateOfferWalletModal
        open={showWalletGate}
        returnPath={id ? `/deals/workspace/${id}` : undefined}
        onClose={() => {
          setShowWalletGate(false);
          void refreshPayoutWallet();
        }}
      />
    </div>
  );
};

export default DealWorkspacePage;
