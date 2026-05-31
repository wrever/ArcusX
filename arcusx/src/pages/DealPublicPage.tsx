import { useEffect, useState } from 'react';
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
import {
  acceptDeal,
  getDealByToken,
  type AgreementDeal,
} from '../services/dealsService';
import { createAndFundDealEscrow, funderWallet, type DealEscrowHooks } from '../services/dealEscrow';
import { dealPlatformFeePercent } from '../utils/dealHelpers';
import Navbar from '../components/Navbar';
import '../css/DealsPages.css';

const DealPublicPage = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { address, isConnected, connectWallet, kit } = useWallet();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { sendTransaction } = useSendTransaction();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  const [deal, setDeal] = useState<AgreementDeal | null>(null);
  const [canAccept, setCanAccept] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadDeal = () => {
    if (!token) return;
    setLoading(true);
    getDealByToken(token)
      .then((r) => {
        setDeal(r.deal);
        setCanAccept(Boolean(r.can_accept));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDeal();
  }, [token]);

  const handleAccept = async () => {
    if (!token || !address) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/deal/${token}`)}`);
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await acceptDeal(token, address);
      loadDeal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.error.generic'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFund = async () => {
    if (!deal || !address || !kit || !token) return;
    setActionLoading(true);
    setError('');
    try {
      const full = await getDealByToken(token);
      const result = await createAndFundDealEscrow({
        deal: full.deal,
        funderAddress: address,
        hooks: {
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
        },
      });
      if (!result.success) throw new Error(result.error);
      navigate(`/deals/workspace/${full.deal.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.error.generic'));
    } finally {
      setActionLoading(false);
    }
  };

  const payerAddr = deal ? funderWallet(deal) : '';
  const showAccept = deal?.status === 'sent' && canAccept;
  const showFund =
    deal &&
    deal.status === 'accepted' &&
    isConnected &&
    address === payerAddr &&
    !deal.escrow_contract_id;

  return (
    <>
      <Navbar />
      <div className="deals-page">
        <h1><FaHandshake /> {t('deals.public.title')}</h1>
        <p className="deals-lead">{t('deals.public.lead')}</p>

        {loading && <p>{t('deals.loading')}</p>}
        {error && <p className="deals-error" role="alert">{error}</p>}

        {deal && !loading && (
          <div className="deals-form-card">
            <span className={`deals-status-badge ${deal.status}`}>{deal.status}</span>
            <h2 style={{ marginTop: '1rem' }}>{deal.title}</h2>
            <p className="deals-public-desc">{deal.description}</p>
            <div className="deals-summary-row"><span>{t('deals.wizard.protected')}</span><strong>{Number(deal.amount_usdc).toFixed(2)} USDC</strong></div>
            <div className="deals-summary-row"><span>{t('deals.list.fee')}</span><strong>{dealPlatformFeePercent(deal).toFixed(1)}%</strong></div>
            <div className="deals-summary-row"><span>{t('deals.wizard.totalDeposit')}</span><strong>{Number(deal.client_total).toFixed(2)} USDC</strong></div>
            <p className="deals-disclaimer">{t('deals.public.releaseNote')}: <code>{deal.release_signer_wallet.slice(0, 8)}…</code></p>

            {showAccept && (
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

            {showFund && (
              <button type="button" className="deals-btn primary" disabled={actionLoading} onClick={() => void handleFund()}>
                {actionLoading ? '…' : t('deals.public.fundEscrow')}
              </button>
            )}

            {deal.escrow_contract_id && (
              <Link to={`/deals/workspace/${deal.id}`} className="deals-btn primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
                {t('deals.public.openWorkspace')}
              </Link>
            )}

            {deal.status === 'sent' && !isAuthenticated && (
              <p style={{ marginTop: '1rem' }}>
                <Link to={`/login?redirect=${encodeURIComponent(`/deal/${token}`)}`}>{t('deals.public.loginToAccept')}</Link>
              </p>
            )}

            {isAuthenticated && deal.status === 'sent' && !canAccept && !showAccept && (
              <p className="deals-disclaimer" style={{ marginTop: '1rem' }}>{t('deals.public.ownDeal')}</p>
            )}
          </div>
        )}
        <p className="deals-disclaimer">{t('deals.disclaimer')}</p>
      </div>
    </>
  );
};

export default DealPublicPage;
