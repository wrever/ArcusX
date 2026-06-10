import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaHandshake, FaPlus, FaSearch } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import { dealsEnabled } from '../config/deals';
import { buildDashboardSearchParams } from '../config/dashboardTabs';
import { getMyDeals, type AgreementDeal } from '../services/dealsService';
import { partitionDeals } from '../utils/dealHelpers';
import DealListCard from './DealListCard';
import DealPublicPage from '../pages/DealPublicPage';
import PayoutWalletBanner from './PayoutWalletBanner';
import '../css/DashboardDealsPanel.css';

type DashboardDealsPanelProps = {
  payoutWalletRegistered: boolean;
  payoutWalletLoading: boolean;
  payoutWalletAddress?: string | null;
  onRequireWallet: () => void;
};

const DashboardDealsPanel = ({
  payoutWalletRegistered,
  payoutWalletLoading,
  payoutWalletAddress = null,
  onRequireWallet,
}: DashboardDealsPanelProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { address } = useWallet();
  const enterprise = useEnterpriseMode();
  const joinDealToken = searchParams.get('join_deal')?.trim() ?? '';

  const [deals, setDeals] = useState<AgreementDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkInput, setLinkInput] = useState('');

  const userId = user?.id != null ? Number(user.id) : null;

  const loadDeals = useCallback(() => {
    if (!dealsEnabled || !payoutWalletRegistered) return;
    setLoading(true);
    setError('');
    getMyDeals()
      .then((r) => setDeals(r.deals ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [payoutWalletRegistered]);

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

  const openDealWorkspace = (deal: AgreementDeal, action?: 'escrow' | 'release') => {
    const q = action ? `?action=${action}` : '';
    navigate(`/deals/workspace/${deal.id}${q}`);
  };

  const guardWallet = () => {
    if (!payoutWalletRegistered) {
      onRequireWallet();
      return false;
    }
    return true;
  };

  const openPastedLink = () => {
    if (!guardWallet()) return;
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

  const exitJoinDeal = () => {
    const params = buildDashboardSearchParams('deals', enterprise, searchParams);
    params.delete('join_deal');
    const qs = params.toString();
    navigate(qs ? `/dashboard?${qs}` : '/dashboard', { replace: true });
  };

  if (joinDealToken) {
    return (
      <div className="dashboard-deals-panel dashboard-deals-panel--join">
        <button type="button" className="dashboard-deals-btn secondary" onClick={exitJoinDeal}>
          <FaArrowLeft /> {t('deals.join.back')}
        </button>
        <DealPublicPage mode="internal" embedded dealToken={joinDealToken} />
      </div>
    );
  }

  return (
    <div className="dashboard-deals-panel">
      <PayoutWalletBanner
        loading={payoutWalletLoading}
        registered={payoutWalletRegistered}
        address={payoutWalletAddress}
        onRegisterClick={onRequireWallet}
        className="dashboard-deals-wallet-banner"
      />

      <header className="dashboard-deals-panel__header">
        <div className="dashboard-deals-panel__icon" aria-hidden>
          <FaHandshake />
        </div>
        <div>
          <h2>{t('dashboard.deals.title')}</h2>
          <p>{t('dashboard.deals.subtitle')}</p>
        </div>
      </header>

      {!payoutWalletRegistered && !payoutWalletLoading && (
        <p className="dashboard-deals-hint" role="status">
          {t('dashboard.privateOffers.walletRequired')}
        </p>
      )}

      <div className="dashboard-deals-panel__actions">
        <button
          type="button"
          className="dashboard-deals-btn primary"
          disabled={!dealsEnabled || !payoutWalletRegistered}
          onClick={() => {
            if (!guardWallet()) return;
            navigate('/deals/new');
          }}
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
                    onFund={(deal) => openDealWorkspace(deal, 'escrow')}
                    onPrepare={(deal) => openDealWorkspace(deal, 'escrow')}
                    onRelease={(deal) => openDealWorkspace(deal, 'release')}
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
                    onFund={(deal) => openDealWorkspace(deal, 'escrow')}
                    onPrepare={(deal) => openDealWorkspace(deal, 'escrow')}
                    onRelease={(deal) => openDealWorkspace(deal, 'release')}
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
