import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaHandshake, FaWallet } from 'react-icons/fa';
import {
  useInitializeEscrow,
  useFundEscrow,
  useGetEscrowFromIndexerByContractIds,
  useSendTransaction,
} from '@trustless-work/escrow';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useDealEscrowChainState } from '../hooks/useDealEscrowChainState';
import {
  acceptDeal,
  completeDeal,
  finalizeDealEscrow,
  getDealByToken,
  type AgreementDeal,
} from '../services/dealsService';
import { authService } from '../services/authService';
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
import { dealBeneficiaryNet, dealPlatformFeeRate, isDealBeneficiaryViewer } from '../utils/dealHelpers';
import { quoteBilateralFromNominal } from '../utils/bilateralFeeModel';
import EscrowFeeBreakdown from '../components/EscrowFeeBreakdown';
import { devError } from '../utils/logger';
import Navbar from '../components/Navbar';
import DealShareLink from '../components/DealShareLink';
import DealEscrowProcessPopup, { type DealEscrowFlowMode } from '../components/DealEscrowProcessPopup';
import PrivateOfferWalletModal from '../components/PrivateOfferWalletModal';
import { usePayoutWallet } from '../hooks/usePayoutWallet';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import { dashboardTabHref, dealJoinDashboardHref } from '../config/dashboardTabs';
import '../css/DealsPages.css';

type DealPageMode = 'preview' | 'internal';

type DealPublicPageProps = {
  mode?: DealPageMode;
  /** Render dentro del dashboard (sin Navbar de landing). */
  embedded?: boolean;
  /** Token cuando no viene de la ruta (dashboard ?join_deal=). */
  dealToken?: string;
};

const DealPublicPage = ({ mode = 'preview', embedded = false, dealToken }: DealPublicPageProps) => {
  const { token: routeToken } = useParams<{ token: string }>();
  const token = (dealToken ?? routeToken)?.trim();
  const enterprise = useEnterpriseMode();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { address, isConnected, connectWallet, kit } = useWallet();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { sendTransaction } = useSendTransaction();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  const getEscrowRef = useRef(getEscrowByContractIds);
  getEscrowRef.current = getEscrowByContractIds;
  const [deal, setDeal] = useState<AgreementDeal | null>(null);
  const [canAccept, setCanAccept] = useState(false);
  const [viewerRole, setViewerRole] = useState<'initiator' | 'counterparty' | 'guest' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [escrowPopupOpen, setEscrowPopupOpen] = useState(false);
  const [showWalletGate, setShowWalletGate] = useState(false);
  const { registered: payoutRegistered, refresh: refreshPayoutWallet } = usePayoutWallet();

  const isPreview = mode === 'preview';
  const internalDealPath = token
    ? dealJoinDashboardHref(token, enterprise)
    : dashboardTabHref('deals', enterprise);
  const previewDealPath = token ? `/deal/${token}` : dashboardTabHref('deals', enterprise);

  const loadDeal = () => {
    if (!token) return;
    setLoading(true);
    getDealByToken(token)
      .then((r) => {
        setDeal(r.deal);
        setCanAccept(Boolean(r.can_accept));
        setViewerRole(
          r.viewer_role === 'initiator' || r.viewer_role === 'counterparty'
            ? r.viewer_role
            : null,
        );
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDeal();
  }, [token]);

  useEffect(() => {
    if (isPreview || !token || loading || !deal) return;
    if (viewerRole === 'initiator' && deal.status === 'sent') {
      navigate(
        embedded ? dashboardTabHref('deals', enterprise) : previewDealPath,
        { replace: true },
      );
    }
  }, [isPreview, embedded, enterprise, viewerRole, deal, token, loading, previewDealPath, navigate]);

  useEffect(() => {
    if (isPreview || !isAuthenticated) return;
    void refreshPayoutWallet().then(({ registered }) => {
      if (!registered) setShowWalletGate(true);
    });
  }, [isPreview, isAuthenticated, refreshPayoutWallet]);

  const requirePayoutWallet = () => {
    if (!isAuthenticated) return true;
    if (!payoutRegistered) {
      setShowWalletGate(true);
      return false;
    }
    return true;
  };

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
        if (!cancelled) loadDeal();
      })
      .catch((e: unknown) => devError('deal escrow reconcile failed', e));

    return () => {
      cancelled = true;
    };
  }, [deal?.id, deal?.status, deal?.escrow_contract_id, chain.funded, address]);

  const handleAccept = async () => {
    if (!token || !address) return;
    if (!requirePayoutWallet()) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(internalDealPath)}`);
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await acceptDeal(token, address);
      try {
        await authService.registerWallet(address);
      } catch (walletErr: unknown) {
        devError('registerWallet after accept failed (non-fatal)', walletErr);
      }
      loadDeal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.error.generic'));
    } finally {
      setActionLoading(false);
    }
  };

  const payerAddr = deal ? funderWallet(deal) : '';
  const deployerAddr = deal ? deploySignerWallet(deal) : '';
  const commerce = deal ? isCommerceFunderDeal(deal) : false;
  const isOwnerPreview =
    isPreview && deal?.status === 'sent' && viewerRole === 'initiator' && Boolean(token);
  const isGuestPreview = isPreview && deal?.status === 'sent' && !isOwnerPreview;
  const showShareAsOwner = isOwnerPreview;
  const showAccept = deal?.status === 'sent' && canAccept;

  const needsCommerceEscrow =
    deal &&
    commerce &&
    deal.status === 'accepted' &&
    viewerRole === 'counterparty' &&
    address === payerAddr &&
    address === deployerAddr &&
    !chain.funded;

  const needsFund =
    deal &&
    deal.status === 'accepted' &&
    address === payerAddr &&
    Boolean(deal.escrow_contract_id) &&
    !chain.funded;

  const needsFreelancerEscrow =
    deal &&
    !commerce &&
    deal.status === 'accepted' &&
    address === payerAddr &&
    !chain.funded;

  const escrowFlowMode: DealEscrowFlowMode | null = useMemo(() => {
    if (needsCommerceEscrow && !deal?.escrow_contract_id) return 'deploy_and_fund';
    if (needsFund) return 'fund_only';
    if (needsFreelancerEscrow) return 'deploy_and_fund';
    return null;
  }, [needsCommerceEscrow, needsFund, needsFreelancerEscrow, deal?.escrow_contract_id]);

  const showWaitingContract =
    deal &&
    commerce &&
    deal.status === 'accepted' &&
    viewerRole === 'initiator' &&
    !deal.escrow_contract_id;

  const handleFund = async (contractId: string) => {
    if (!deal || !address || !token) return { success: false, error: t('deals.error.generic') };
    const full = await getDealByToken(token);
    if (!full.deal.escrow_contract_id) {
      const combined = await createAndFundDealEscrow({
        deal: full.deal,
        funderAddress: address,
        hooks: escrowHooks,
      });
      return { success: combined.success, error: combined.error, escrowId: combined.contractId };
    }
    const result = await fundDealEscrow({
      deal: { ...full.deal, escrow_contract_id: contractId },
      funderAddress: address,
      hooks: escrowHooks,
    });
    return { success: result.success, error: result.error, escrowId: result.contractId };
  };

  const onDeployForPopup = async () => {
    if (!deal || !address || !token) return { success: false, error: t('deals.error.generic') };
    const full = await getDealByToken(token);
    if (full.deal.escrow_contract_id) {
      return { success: true, escrowId: full.deal.escrow_contract_id };
    }
    return deployDealEscrow({ deal: full.deal, signerAddress: address, hooks: escrowHooks }).then(
      (r) => ({
        success: r.success,
        error: r.error,
        escrowId: r.contractId,
      }),
    );
  };

  return (
    <>
      {!embedded && <Navbar />}
      <div
        className={
          embedded
            ? 'deals-page deals-page--embedded'
            : 'deals-page deals-page--below-nav'
        }
      >
        <h1>
          <FaHandshake /> {t(isPreview ? 'deals.public.title' : 'deals.join.title')}
        </h1>
        <p className="deals-lead">{t(isPreview ? 'deals.public.previewLead' : 'deals.join.lead')}</p>

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

            {!isPreview && (
              <p className="deals-disclaimer">
                {t('deals.public.releaseNote')}:{' '}
                <code>
                  {(commerce && deal.status === 'sent'
                    ? t('deals.public.releaseNoteBuyerPending')
                    : releaseSignerWallet(deal).slice(0, 8) + '…')}
                </code>
              </p>
            )}

            {!isPreview && commerce && (
              <ol className="deals-commerce-steps deals-commerce-steps--compact">
                <li className={deal.status !== 'sent' ? 'is-done' : 'is-current'}>{t('deals.commerce.step1')}</li>
                <li className={deal.status === 'accepted' || deal.status === 'funded' || deal.status === 'active' || deal.status === 'completed' ? 'is-done' : deal.status === 'sent' ? 'is-current' : ''}>{t('deals.commerce.step2')}</li>
                <li className={deal.escrow_contract_id || chain.contractOnChain ? 'is-done' : deal.status === 'accepted' ? 'is-current' : ''}>{t('deals.commerce.step3')}</li>
                <li className={chain.funded ? 'is-done' : deal.escrow_contract_id ? 'is-current' : ''}>{t('deals.commerce.step4')}</li>
              </ol>
            )}

            {isGuestPreview && (
              <div className="deals-public-preview-cta">
                <p className="deals-public-preview-cta__note">{t('deals.public.previewInstructions')}</p>
                {!isAuthenticated ? (
                  <Link
                    to={`/login?redirect=${encodeURIComponent(internalDealPath)}`}
                    className="deals-btn primary"
                  >
                    {t('deals.public.confirmCta')}
                  </Link>
                ) : canAccept ? (
                  <Link to={internalDealPath} className="deals-btn primary">
                    {t('deals.public.confirmCta')}
                  </Link>
                ) : (
                  <p className="deals-disclaimer">{t('deals.public.previewUnavailable')}</p>
                )}
              </div>
            )}

            {!isPreview && escrowFlowMode && isConnected && (
              <button
                type="button"
                className="deals-btn primary"
                onClick={() => {
                  if (!requirePayoutWallet()) return;
                  setEscrowPopupOpen(true);
                }}
              >
                {t('deals.public.payEscrow')}
              </button>
            )}

            {!isPreview && escrowFlowMode && !isConnected && (
              <button type="button" className="deals-btn primary" onClick={() => void connectWallet()}>
                <FaWallet /> {t('deals.wizard.connectWallet')}
              </button>
            )}

            {!isPreview && showAccept && (
              <>
                {!isConnected ? (
                  <button type="button" className="deals-btn primary" onClick={() => void connectWallet()}>
                    <FaWallet /> {t('deals.wizard.connectWallet')}
                  </button>
                ) : (
                  <button type="button" className="deals-btn primary" disabled={actionLoading} onClick={() => void handleAccept()}>
                    {actionLoading ? '…' : t('deals.public.accept')}
                  </button>
                )}
              </>
            )}

            {chain.funded && isAuthenticated && (
              <Link to={`/deals/workspace/${deal.id}`} className="deals-btn primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
                {t('deals.public.openWorkspace')}
              </Link>
            )}

            {!isPreview && deal.escrow_contract_id && !chain.funded && viewerRole === 'initiator' && commerce && (
              <p className="deals-disclaimer" style={{ marginTop: '1rem' }}>{t('deals.workspace.waitingFund')}</p>
            )}

            {!isPreview && showWaitingContract && (
              <p className="deals-disclaimer" style={{ marginTop: '1rem' }}>{t('deals.workspace.waitingBuyerContract')}</p>
            )}

            {isGuestPreview && (
              <p className="deals-disclaimer" style={{ marginTop: '0.75rem' }}>
                {t('deals.public.previewFooter')}
              </p>
            )}

            {showShareAsOwner && token && (
              <DealShareLink dealToken={token} hint={t('deals.public.ownDeal')} />
            )}
          </div>
        )}
        <p className="deals-disclaimer">{t('deals.disclaimer')}</p>
      </div>

      {deal && !isPreview && escrowFlowMode && (
        <DealEscrowProcessPopup
          isOpen={escrowPopupOpen}
          onClose={() => setEscrowPopupOpen(false)}
          onComplete={() => {
            setEscrowPopupOpen(false);
            void chain.refresh();
            loadDeal();
            if (needsCommerceEscrow || needsFund || needsFreelancerEscrow) {
              navigate(`/deals/workspace/${deal.id}`);
            }
          }}
          mode={escrowFlowMode}
          deal={deal}
          isWalletConnected={isConnected}
          onConnectWallet={async () => {
            try {
              await connectWallet();
              return { success: true };
            } catch (e: unknown) {
              return { success: false, error: e instanceof Error ? e.message : t('deals.error.generic') };
            }
          }}
          onDeploy={onDeployForPopup}
          onFund={handleFund}
          initialEscrowId={deal.escrow_contract_id}
          chainAlreadyFunded={chain.funded}
        />
      )}

      <PrivateOfferWalletModal
        open={showWalletGate}
        returnPath={!isPreview ? internalDealPath : undefined}
        onClose={() => {
          setShowWalletGate(false);
          void refreshPayoutWallet();
        }}
      />
    </>
  );
};

export default DealPublicPage;
