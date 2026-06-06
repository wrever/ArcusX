import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FaHandshake } from 'react-icons/fa';
import {
  useApproveMilestone,
  useReleaseFunds,
  useSendTransaction,
  useInitializeEscrow,
  useFundEscrow,
  useGetEscrowFromIndexerByContractIds,
} from '@trustless-work/escrow';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useDealEscrowChainState } from '../hooks/useDealEscrowChainState';
import {
  approveMilestoneTrustlessEscrow,
  releaseFundsTrustlessEscrow,
} from '../services/trustlessWorkEscrowService';
import {
  completeDeal,
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
import { dealPlatformFeeRate, dealRatedUserId } from '../utils/dealHelpers';
import { quoteEscrowCommission } from '../utils/escrowFeeQuote';
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
  const [deal, setDeal] = useState<AgreementDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [escrowPopupOpen, setEscrowPopupOpen] = useState(false);
  const [completePopupOpen, setCompletePopupOpen] = useState(false);

  const userId = user?.id != null ? Number(user.id) : null;

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
        const result = await getEscrowByContractIds({
          contractIds: ids,
          validateOnChain: Array.isArray(contractIds) ? true : contractIds.validateOnChain ?? true,
        });
        return Array.isArray(result) ? result : (result as { escrows?: unknown[] })?.escrows ?? result ?? [];
      },
    }),
    [kit, deployEscrow, fundEscrow, sendTransaction, getEscrowByContractIds],
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
          <h2>{deal.title}</h2>
          <p>{deal.description}</p>
          <div className="deals-summary-row"><span>{t('deals.wizard.protected')}</span><strong>{Number(deal.amount_usdc).toFixed(2)} USDC</strong></div>
          {(() => {
            const feeRate = dealPlatformFeeRate(deal);
            const quote = quoteEscrowCommission(Number(deal.amount_usdc), feeRate);
            return (
              <EscrowFeeBreakdown
                platformFee={feeRate}
                layout="flex-rows"
                totalUsdc={quote.totalCommission.toFixed(7)}
                platformUsdc={quote.platformCommission.toFixed(7)}
                protocolUsdc={quote.protocolCommission.toFixed(7)}
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
              onClick={() => setEscrowPopupOpen(true)}
            >
              {t('deals.workspace.payEscrow')}
            </button>
          )}

          {needsRelease && (
            <button
              type="button"
              className="deals-btn primary"
              style={{ marginTop: escrowFlowMode ? '0.75rem' : 0 }}
              onClick={() => setCompletePopupOpen(true)}
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

          <Link to={`/deal/${deal.deal_token}`} className="deals-btn secondary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            {t('deals.workspace.viewLink')}
          </Link>
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
          onReleaseFunds={async () => {
            const result = await handleReleaseFunds();
            if (result.success) {
              await markDealReleased(deal.id, result.txHash);
            }
            return result;
          }}
          onVerifyMilestone={handleVerifyMilestone}
          platformFeeOverride={dealPlatformFeeRate(deal)}
        />
      )}
    </div>
  );
};

export default DealWorkspacePage;
