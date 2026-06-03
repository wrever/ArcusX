import { Link } from 'react-router-dom';
import { FaCopy, FaExternalLinkAlt, FaHandshake, FaWallet, FaUnlock } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import type { AgreementDeal } from '../services/dealsService';
import { dealPublicUrl } from '../services/dealsService';
import { getDealActions } from '../utils/dealHelpers';
import { dealPlatformFeePercent } from '../utils/dealHelpers';

type DealListCardProps = {
  deal: AgreementDeal;
  userId: number | null;
  walletAddress: string | null;
  onFund?: (deal: AgreementDeal) => void;
  onRelease?: (deal: AgreementDeal) => void;
  fundLoading?: boolean;
  releaseLoading?: boolean;
};

const DealListCard = ({
  deal,
  userId,
  walletAddress,
  onFund,
  onRelease,
  fundLoading,
  releaseLoading,
}: DealListCardProps) => {
  const { t } = useI18n();
  const actions = getDealActions(deal, userId, walletAddress);
  const feePct = dealPlatformFeePercent(deal);

  const copyLink = () => void navigator.clipboard.writeText(dealPublicUrl(deal.deal_token));

  const statusLabel = t(`deals.status.${deal.status}`, deal.status);

  return (
    <li className="deals-list-item deal-list-card">
      <div className="deal-list-card__body">
        <div className="deal-list-card__head">
          <h4 className="deal-list-card__title">{deal.title}</h4>
          <span className={`deals-status-badge deals-status-badge--${deal.status}`}>{statusLabel}</span>
        </div>
        <p className="deal-list-card__meta">
          {Number(deal.amount_usdc).toFixed(2)} USDC · {t('deals.list.deposit')}{' '}
          {Number(deal.client_total).toFixed(2)} USDC · {t('deals.list.fee')} {feePct.toFixed(1)}%
        </p>
        <p className="deal-list-card__template">{t(`deals.template.${templateLabel(deal.template_id)}`)}</p>
      </div>
      <div className="deal-list-card__actions">
        {actions.includes('workspace') && (
          <Link to={`/deals/workspace/${deal.id}`} className="dashboard-deals-btn primary">
            <FaHandshake /> {t('deals.workspace.open')}
          </Link>
        )}
        {actions.includes('copy_link') && (
          <button type="button" className="dashboard-deals-btn secondary" onClick={copyLink}>
            <FaCopy /> {t('deals.wizard.copyLink')}
          </button>
        )}
        {actions.includes('open_link') && (
          <Link to={`/deal/${deal.deal_token}`} className="dashboard-deals-btn secondary">
            <FaExternalLinkAlt /> {t('deals.list.openLink')}
          </Link>
        )}
        {actions.includes('accept') && (
          <Link to={`/deal/${deal.deal_token}`} className="dashboard-deals-btn primary">
            {t('deals.public.accept')}
          </Link>
        )}
        {actions.includes('fund') && onFund && (
          <button
            type="button"
            className="dashboard-deals-btn primary"
            disabled={fundLoading}
            onClick={() => onFund(deal)}
          >
            <FaWallet /> {fundLoading ? '…' : t('deals.public.fundEscrow')}
          </button>
        )}
        {actions.includes('release') && onRelease && (
          <button
            type="button"
            className="dashboard-deals-btn primary"
            disabled={releaseLoading}
            onClick={() => onRelease(deal)}
          >
            <FaUnlock /> {releaseLoading ? '…' : t('deals.workspace.release')}
          </button>
        )}
      </div>
    </li>
  );
};

function templateLabel(templateId: string): string {
  if (templateId === 'peer_car_sale') return 'peer_car_sale';
  if (templateId === 'rental_agreement') return 'rental';
  if (templateId === 'freelancer_service') return 'freelancer';
  if (templateId === 'online_coaching') return 'coaching';
  if (templateId === 'home_repair') return 'repair';
  return 'other';
}

export default DealListCard;
