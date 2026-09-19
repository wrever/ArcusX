import { FaExclamationTriangle } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import '../css/DeveloperApiBetaBanner.css';

type DeveloperApiBetaBannerProps = {
  variant?: 'page' | 'compact';
};

const DeveloperApiBetaBanner: React.FC<DeveloperApiBetaBannerProps> = ({ variant = 'page' }) => {
  const { t } = useI18n();

  return (
    <div
      className={`dev-api-beta-banner dev-api-beta-banner--${variant}`}
      role="alert"
      aria-live="polite"
    >
      <FaExclamationTriangle className="dev-api-beta-banner__icon" aria-hidden />
      <div className="dev-api-beta-banner__text">
        <strong className="dev-api-beta-banner__title">{t('dashboard.developer.beta.title')}</strong>
        <p className="dev-api-beta-banner__body">{t('dashboard.developer.beta.body')}</p>
      </div>
    </div>
  );
};

export default DeveloperApiBetaBanner;
