import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCode,
  FaKey,
  FaLock,
  FaShieldAlt,
} from 'react-icons/fa';
import ApiKeysPanel from '../components/ApiKeysPanel';
import DeveloperApiBetaBanner from '../components/DeveloperApiBetaBanner';
import { dashboardTabHref } from '../config/dashboardTabs';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import { useI18n } from '../i18n/I18nProvider';
import '../css/DashboardDeveloperPage.css';

const DashboardDeveloperPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const enterprise = useEnterpriseMode();
  const settingsHref = dashboardTabHref('settings', enterprise);

  const goBack = useCallback(() => {
    navigate(settingsHref);
  }, [navigate, settingsHref]);

  return (
    <div className="dashboard-developer-page">
      <header className="dashboard-developer-page__header">
        <button type="button" className="dashboard-developer-page__back" onClick={goBack}>
          <FaArrowLeft aria-hidden />
          <span>{t('dashboard.developer.page.back')}</span>
        </button>
      </header>

      <main className="dashboard-developer-page__main">
        <DeveloperApiBetaBanner variant="page" />

        <div className="dashboard-developer-page__intro">
          <span className="dashboard-developer-page__eyebrow">
            <FaCode aria-hidden /> {t('dashboard.developer.page.eyebrow')}
          </span>
          <h1 className="dashboard-developer-page__title">{t('dashboard.developer.page.title')}</h1>
          <p className="dashboard-developer-page__lead">{t('dashboard.developer.page.lead')}</p>
        </div>

        <section className="dashboard-developer-page__security" aria-labelledby="dev-security-title">
          <div className="dashboard-developer-page__security-head">
            <FaShieldAlt aria-hidden />
            <h2 id="dev-security-title">{t('dashboard.developer.security.title')}</h2>
          </div>
          <ul className="dashboard-developer-page__security-list">
            <li>{t('dashboard.developer.security.rule1')}</li>
            <li>{t('dashboard.developer.security.rule2')}</li>
            <li>{t('dashboard.developer.security.rule3')}</li>
            <li>{t('dashboard.developer.security.rule4')}</li>
            <li>{t('dashboard.developer.security.rule5')}</li>
          </ul>
        </section>

        <section className="dashboard-developer-page__steps" aria-labelledby="dev-steps-title">
          <h2 id="dev-steps-title">{t('dashboard.developer.steps.title')}</h2>
          <ol className="dashboard-developer-page__steps-list">
            <li>{t('dashboard.developer.steps.1')}</li>
            <li>{t('dashboard.developer.steps.2')}</li>
            <li>{t('dashboard.developer.steps.3')}</li>
            <li>{t('dashboard.developer.steps.4')}</li>
          </ol>
        </section>

        <section className="dashboard-developer-page__keys-card">
          <div className="dashboard-developer-page__keys-head">
            <FaKey aria-hidden />
            <h2>{t('dashboard.developer.keysSection.title')}</h2>
          </div>
          <p className="dashboard-developer-page__keys-desc">{t('dashboard.developer.keysSection.desc')}</p>
          <ApiKeysPanel variant="page" />
        </section>

        <section className="dashboard-developer-page__sdk" aria-labelledby="dev-sdk-title">
          <div className="dashboard-developer-page__sdk-head">
            <FaLock aria-hidden />
            <h2 id="dev-sdk-title">{t('dashboard.developer.sdk.title')}</h2>
          </div>
          <p>{t('dashboard.developer.sdk.body')}</p>
          <ul className="dashboard-developer-page__sdk-list">
            <li><code>@arcusx/sdk</code> — {t('dashboard.developer.sdk.item1')}</li>
            <li><code>Authorization: Bearer axk_…</code> — {t('dashboard.developer.sdk.item2')}</li>
            <li><code>client.agent.*</code> — {t('dashboard.developer.sdk.item3')}</li>
          </ul>
          <p className="dashboard-developer-page__sdk-note">{t('dashboard.developer.sdk.note')}</p>
        </section>
      </main>
    </div>
  );
};

export default DashboardDeveloperPage;
