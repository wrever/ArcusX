import { Link } from 'react-router-dom';
import { FaArrowRight, FaBookOpen, FaCode, FaKey } from 'react-icons/fa';
import DeveloperApiBetaBanner from './DeveloperApiBetaBanner';
import { DOCS_SITE_URL } from '../config/docsSite';
import { useI18n } from '../i18n/I18nProvider';
import '../css/SettingsDeveloperPromo.css';

const SettingsDeveloperPromo: React.FC = () => {
  const { t } = useI18n();

  return (
    <section
      id="settings-developer-promo"
      className="settings-dev-promo"
      aria-label={t('dashboard.developer.promo.title')}
    >
      <DeveloperApiBetaBanner variant="compact" />
      <div className="settings-dev-promo__shell">
        <div className="settings-dev-promo__icon-wrap">
          <FaKey className="settings-dev-promo__icon" aria-hidden />
        </div>
        <div className="settings-dev-promo__text">
          <p className="settings-dev-promo__eyebrow">
            <FaCode aria-hidden /> {t('dashboard.developer.page.eyebrow')}
          </p>
          <h3 className="settings-dev-promo__title">{t('dashboard.developer.promo.title')}</h3>
          <p className="settings-dev-promo__body">{t('dashboard.developer.promo.body')}</p>
        </div>
        <div className="settings-dev-promo__actions">
          <a
            className="settings-dev-promo__docs"
            href={`${DOCS_SITE_URL}/developers`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaBookOpen aria-hidden />
            {t('dashboard.developer.docs.all')}
          </a>
          <Link to="/dashboard/developer" className="settings-dev-promo__cta">
            {t('dashboard.developer.promo.cta')}
            <FaArrowRight aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SettingsDeveloperPromo;
