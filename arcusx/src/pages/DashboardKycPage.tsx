import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaShieldAlt } from 'react-icons/fa';
import AccountVerificationPanel from '../components/AccountVerificationPanel';
import { dashboardTabHref } from '../config/dashboardTabs';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import { useI18n } from '../i18n/I18nProvider';
import '../css/DashboardKycPage.css';

const DashboardKycPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const enterprise = useEnterpriseMode();

  const settingsHref = dashboardTabHref('settings', enterprise);

  const goBack = useCallback(() => {
    navigate(settingsHref);
  }, [navigate, settingsHref]);

  const handleSubmitted = useCallback(() => {
    navigate(settingsHref, { replace: true });
  }, [navigate, settingsHref]);

  return (
    <div className="dashboard-kyc-page">
      <header className="dashboard-kyc-page__header">
        <button type="button" className="dashboard-kyc-page__back" onClick={goBack}>
          <FaArrowLeft aria-hidden />
          <span>{t('kyc.page.back')}</span>
        </button>
      </header>

      <main className="dashboard-kyc-page__main">
        <div className="dashboard-kyc-page__intro">
          <span className="dashboard-kyc-page__eyebrow">
            <FaShieldAlt aria-hidden /> {t('kyc.settings.promo.eyebrow')}
          </span>
          <h1 className="dashboard-kyc-page__title">
            {enterprise ? t('kyc.page.title.enterprise') : t('kyc.page.title')}
          </h1>
          <p className="dashboard-kyc-page__lead">
            {enterprise ? t('kyc.page.lead.enterprise') : t('kyc.page.lead')}
          </p>
        </div>

        <AccountVerificationPanel onSubmitted={handleSubmitted} />
      </main>
    </div>
  );
};

export default DashboardKycPage;
