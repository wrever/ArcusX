import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaHandshake, FaPlus, FaSearch } from 'react-icons/fa';
import {
  useInitializeEscrow,
  useFundEscrow,
  useGetEscrowFromIndexerByContractIds,
  useSendTransaction,
  useApproveMilestone,
  useReleaseFunds,
} from '@trustless-work/escrow';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { dealsEnabled } from '../config/deals';
import {
  getMyDeals,
  getDealDetails,
  type AgreementDeal,
} from '../services/dealsService';
import { createAndFundDealEscrow, type DealEscrowHooks } from '../services/dealEscrow';
import {
  approveMilestoneTrustlessEscrow,
  releaseFundsTrustlessEscrow,
} from '../services/trustlessWorkEscrowService';
import { markDealReleased } from '../services/dealsService';
import { partitionDeals } from '../utils/dealHelpers';
import DealListCard from './DealListCard';
import '../css/DashboardDealsPanel.css';

const DashboardDealsPanel = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { address, kit, connectWallet } = useWallet();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { sendTransaction } = useSendTransaction();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  const { approveMilestone } = useApproveMilestone();
  const { releaseFunds } = useReleaseFunds();

  const [deals, setDeals] = useState<AgreementDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [fundId, setFundId] = useState<string | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);

  const userId = user?.id != null ? Number(user.id) : null;

  const loadDeals = useCallback(() => {
    if (!dealsEnabled) return;
    setLoading(true);
    setError('');
    getMyDeals()
      .then((r) => setDeals(r.deals ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    const open = searchParams.get('open_deal');
    if (open) setLinkInput(open);
  }, [searchParams]);

  const { created, received } = userId != null
    ? partitionDeals(deals, userId)
    : { created: [], received: [] };

  const escrowHooks: DealEscrowHooks = {
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
  };

  const handleFund = async (deal: AgreementDeal) => {
    if (!address || !kit) {
      await connectWallet();
      return;
    }
    setFundId(deal.id);
    setError('');
    try {
      const fresh = await getDealDetails(deal.id);
      const result = await createAndFundDealEscrow({
        deal: fresh.deal,
        funderAddress: address,
        hooks: escrowHooks,
      });
      if (!result.success) throw new Error(result.error);
      loadDeals();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.error.generic'));
    } finally {
      setFundId(null);
    }
  };

  const handleRelease = async (deal: AgreementDeal) => {
    if (!address || !kit || !deal.escrow_contract_id) {
      await connectWallet();
      return;
    }
    setReleaseId(deal.id);
    setError('');
    try {
      const contractId = deal.escrow_contract_id;
      const approveResult = await approveMilestoneTrustlessEscrow(
        contractId,
        '0',
        address,
        kit,
        approveMilestone,
        sendTransaction,
      );
      if (!approveResult.success && !approveResult.alreadyApproved) {
        throw new Error(approveResult.error);
      }
      const releaseResult = await releaseFundsTrustlessEscrow(
        contractId,
        address,
        kit,
        releaseFunds,
        sendTransaction,
      );
      if (!releaseResult.success && !releaseResult.alreadyReleased) {
        throw new Error(releaseResult.error);
      }
      await markDealReleased(deal.id, releaseResult.txHash);
      loadDeals();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.error.generic'));
    } finally {
      setReleaseId(null);
    }
  };

  const openPastedLink = () => {
    const raw = linkInput.trim();
    if (!raw) return;
    let token = raw;
    try {
      const u = new URL(raw);
      const parts = u.pathname.split('/').filter(Boolean);
      token = parts[parts.length - 1] ?? raw;
    } catch {
      /* token directo */
    }
    navigate(`/deal/${token}`);
  };

  return (
    <div className="dashboard-deals-panel">
      <header className="dashboard-deals-panel__header">
        <div className="dashboard-deals-panel__icon" aria-hidden>
          <FaHandshake />
        </div>
        <div>
          <h2>{t('dashboard.deals.title')}</h2>
          <p>{t('dashboard.deals.subtitle')}</p>
        </div>
      </header>

      <div className="dashboard-deals-panel__actions">
        <button
          type="button"
          className="dashboard-deals-btn primary"
          disabled={!dealsEnabled}
          onClick={() => navigate('/deals/new')}
        >
          <FaPlus /> {t('dashboard.deals.card.create.cta')}
        </button>
      </div>

      <div className="dashboard-deals-open-link">
        <label htmlFor="deal-link-paste">{t('deals.list.pasteLabel')}</label>
        <div className="dashboard-deals-open-link__row">
          <input
            id="deal-link-paste"
            type="text"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder={t('deals.list.pastePlaceholder')}
          />
          <button type="button" className="dashboard-deals-btn primary" onClick={openPastedLink}>
            <FaSearch /> {t('deals.list.pasteGo')}
          </button>
        </div>
      </div>

      {error && <p className="dashboard-deals-error" role="alert">{error}</p>}
      {loading && <p className="dashboard-deals-hint">{t('deals.loading')}</p>}

      {!loading && (
        <>
          <section className="dashboard-deals-section">
            <h3>{t('deals.list.created')}</h3>
            {created.length === 0 ? (
              <p className="dashboard-deals-hint">{t('deals.list.createdEmpty')}</p>
            ) : (
              <ul className="deals-list">
                {created.map((d) => (
                  <DealListCard
                    key={d.id}
                    deal={d}
                    userId={userId}
                    walletAddress={address}
                    onFund={handleFund}
                    onRelease={handleRelease}
                    fundLoading={fundId === d.id}
                    releaseLoading={releaseId === d.id}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="dashboard-deals-section">
            <h3>{t('deals.list.received')}</h3>
            {received.length === 0 ? (
              <p className="dashboard-deals-hint">{t('deals.list.receivedEmpty')}</p>
            ) : (
              <ul className="deals-list">
                {received.map((d) => (
                  <DealListCard
                    key={d.id}
                    deal={d}
                    userId={userId}
                    walletAddress={address}
                    onFund={handleFund}
                    onRelease={handleRelease}
                    fundLoading={fundId === d.id}
                    releaseLoading={releaseId === d.id}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {!loading && created.length === 0 && received.length === 0 && !error && (
        <article className="dashboard-deals-card" style={{ marginTop: '1rem' }}>
          <h3>{t('dashboard.deals.card.how.title')}</h3>
          <ol className="dashboard-deals-steps">
            <li>{t('dashboard.deals.step1')}</li>
            <li>{t('dashboard.deals.step2')}</li>
            <li>{t('dashboard.deals.step3')}</li>
          </ol>
        </article>
      )}
    </div>
  );
};

export default DashboardDealsPanel;
