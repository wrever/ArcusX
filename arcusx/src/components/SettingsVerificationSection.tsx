import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaClock, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import { useI18n } from '../i18n/I18nProvider';
import { KYC_BADGE_ASSETS } from '../config/arcusxBadges';
import {
  getVerificationStatus,
  type KycStatus,
  type VerificationStatusResponse,
} from '../services/kycService';
import '../css/SettingsVerificationSection.css';

const KYC_ROUTE = '/dashboard/kyc';

const SettingsVerificationSection: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const enterprise = useEnterpriseMode();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatusResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getVerificationStatus());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#verificacion' || hash === '#kyc') {
      navigate(KYC_ROUTE, { replace: true });
    }
  }, [navigate]);

  const goToKyc = () => navigate(KYC_ROUTE);

  const kycStatus = (status?.kyc_status ?? 'not_required') as KycStatus;

  if (loading) return null;

  if (kycStatus === 'approved') return null;

  const isReview = kycStatus === 'under_review' || kycStatus === 'pending';
  const isRejected = kycStatus === 'rejected';

  const title = isRejected
    ? t('kyc.notice.rejected.title')
    : isReview
      ? t('kyc.notice.review.title')
      : enterprise
        ? t('kyc.settings.promo.title.enterprise')
        : t('kyc.settings.promo.title');

  const body = isRejected
    ? status?.kyc_rejection_reason || t('kyc.notice.rejected.body')
    : isReview
      ? t('kyc.notice.review.body')
      : enterprise
        ? t('kyc.settings.promo.body.enterprise')
        : t('kyc.settings.promo.body');

  const tone = isRejected ? 'rejected' : isReview ? 'review' : 'action';
  const badgeSrc = isReview && enterprise
    ? KYC_BADGE_ASSETS.enterprisePending
    : enterprise
      ? KYC_BADGE_ASSETS.enterpriseVerified
      : KYC_BADGE_ASSETS.individualVerified;

  return (
    <section
      id="settings-verification"
      className="settings-verify-block"
      aria-label={t('kyc.individual.settings.section.title')}
    >
      <div className={`settings-verify-banner is-${tone}`}>
        <div className="settings-verify-banner__shell">
          <div className="settings-verify-banner__badge-wrap">
            <img src={badgeSrc} alt="" className="settings-verify-banner__badge" />
            {!isReview && !isRejected && (
              <span className="settings-verify-banner__pulse" aria-hidden />
            )}
          </div>
          <div className="settings-verify-banner__text">
            <p className="settings-verify-banner__eyebrow">
              <FaShieldAlt /> {t('kyc.settings.promo.eyebrow')}
            </p>
            <p className="settings-verify-banner__title">{title}</p>
            <p className="settings-verify-banner__body">{body}</p>
          </div>
          {!isReview && !isRejected && (
            <button type="button" className="settings-verify-banner__cta" onClick={goToKyc}>
              {t('kyc.settings.promo.cta')}
              <FaArrowRight />
            </button>
          )}
          {isReview && (
            <button type="button" className="settings-verify-banner__cta settings-verify-banner__cta--muted" onClick={goToKyc}>
              {t('kyc.page.viewStatus')}
              <FaClock />
            </button>
          )}
          {isRejected && (
            <button
              type="button"
              className="settings-verify-banner__cta settings-verify-banner__cta--warn"
              onClick={goToKyc}
            >
              {t('kyc.notice.cta.retry')}
              <FaExclamationTriangle />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default SettingsVerificationSection;
