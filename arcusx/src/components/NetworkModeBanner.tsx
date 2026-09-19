import { FaExclamationTriangle, FaFlask, FaGlobeAmericas } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { useStellarNetwork } from '../hooks/useStellarNetwork';
import { isMainnetEnabled } from '../config/stellarDual';
import '../css/NetworkModeBanner.css';

const NetworkModeBanner: React.FC = () => {
  const { t } = useI18n();
  const { network, switchNetwork } = useStellarNetwork();
  const mainnetOn = isMainnetEnabled();

  if (!mainnetOn) return null;

  const isMainnet = network === 'mainnet';

  return (
    <div
      className={`network-mode-banner network-mode-banner--${isMainnet ? 'mainnet' : 'testnet'}`}
      role="status"
      aria-live="polite"
    >
      <div className="network-mode-banner__info">
        {isMainnet ? (
          <FaExclamationTriangle className="network-mode-banner__icon" aria-hidden />
        ) : (
          <FaFlask className="network-mode-banner__icon" aria-hidden />
        )}
        <div className="network-mode-banner__text">
          <strong>{t(isMainnet ? 'network.mainnet.title' : 'network.testnet.title')}</strong>
          <span>{t(isMainnet ? 'network.mainnet.body' : 'network.testnet.body')}</span>
        </div>
      </div>
      <div className="network-mode-banner__toggle" role="group" aria-label={t('network.toggle.label')}>
        <button
          type="button"
          className={`network-mode-banner__btn${!isMainnet ? ' is-active' : ''}`}
          onClick={() => switchNetwork('testnet')}
        >
          <FaFlask aria-hidden /> {t('network.testnet.short')}
        </button>
        <button
          type="button"
          className={`network-mode-banner__btn${isMainnet ? ' is-active' : ''}`}
          onClick={() => switchNetwork('mainnet')}
        >
          <FaGlobeAmericas aria-hidden /> {t('network.mainnet.short')}
        </button>
      </div>
    </div>
  );
};

export default NetworkModeBanner;
