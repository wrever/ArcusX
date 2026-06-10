import { Link } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';

type Props = {
  loading: boolean;
  registered: boolean | null;
  address: string | null;
  onRegisterClick: () => void;
  className?: string;
};

const PayoutWalletBanner = ({
  loading,
  registered,
  address,
  onRegisterClick,
  className = '',
}: Props) => {
  const { t } = useI18n();

  return (
    <div
      className={`private-offers-wallet-banner ${
        registered ? 'is-registered' : 'is-missing'
      } ${className}`.trim()}
      role="status"
    >
      {loading ? (
        <span>{t('dashboard.privateOffers.walletStatus.loading')}</span>
      ) : registered && address ? (
        <>
          <FaCheckCircle aria-hidden />
          <span>
            {t('dashboard.privateOffers.walletStatus.registered')}{' '}
            <code className="private-offers-wallet-code">
              {address.slice(0, 7)}…{address.slice(-5)}
            </code>
          </span>
          <Link
            to="/dashboard/settings/profile#private-payout-wallet"
            className="private-offers-wallet-link"
          >
            {t('dashboard.privateOffers.walletStatus.change')}
          </Link>
        </>
      ) : (
        <>
          <FaExclamationTriangle aria-hidden />
          <span>{t('dashboard.privateOffers.walletStatus.missing')}</span>
          <button
            type="button"
            className="private-offers-wallet-link-btn"
            onClick={onRegisterClick}
          >
            {t('privateOffers.walletGate.cta')}
          </button>
        </>
      )}
    </div>
  );
};

export default PayoutWalletBanner;
