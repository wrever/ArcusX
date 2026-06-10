import { useNavigate } from 'react-router-dom';
import { FaWallet, FaTimes } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { persistPostWalletRedirect } from '../config/dashboardTabs';
import '../css/PrivateOfferWalletModal.css';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Ruta interna a la que volver tras guardar la wallet (ej. /deals/join/…). */
  returnPath?: string;
};

const PrivateOfferWalletModal = ({ open, onClose, returnPath }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  if (!open) return null;

  const goRegister = () => {
    if (returnPath) persistPostWalletRedirect(returnPath);
    onClose();
    navigate('/dashboard/settings/profile#private-payout-wallet');
  };

  return (
    <div className="private-wallet-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="private-wallet-modal"
        role="dialog"
        aria-labelledby="private-wallet-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="private-wallet-modal-close" onClick={onClose} aria-label={t('common.cancel')}>
          <FaTimes />
        </button>
        <div className="private-wallet-modal-icon" aria-hidden>
          <FaWallet />
        </div>
        <h2 id="private-wallet-modal-title">{t('privateOffers.walletGate.title')}</h2>
        <p>{t('privateOffers.walletGate.body')}</p>
        <div className="private-wallet-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('privateOffers.walletGate.later')}
          </button>
          <button type="button" className="btn-primary" onClick={goRegister}>
            {t('privateOffers.walletGate.cta')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivateOfferWalletModal;
