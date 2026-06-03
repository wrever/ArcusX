import { useCallback, useEffect, useState } from 'react';
import { FaLock } from 'react-icons/fa';
import { BADGE_CATALOG } from '../config/badgeCatalog';
import { getMyBadges } from '../services/badgesService';
import { authService } from '../services/authService';
import { getVerificationStatus, type VerificationStatusResponse } from '../services/kycService';
import type { UserStatistics } from '../types/profile';
import {
  computeEarnedBadgesLocal,
  countEarnedLiveBadges,
  mergeEarnedFromApi,
} from '../utils/badgeEarnedState';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import { useI18n } from '../i18n/I18nProvider';
import '../css/SettingsBadgesCatalog.css';

type Props = {
  userStats: UserStatistics | null;
};

const SettingsBadgesCatalog: React.FC<Props> = ({ userStats }) => {
  const { t } = useI18n();
  const enterprise = useEnterpriseMode();
  const [verification, setVerification] = useState<VerificationStatusResponse | null>(null);
  const [walletRegistered, setWalletRegistered] = useState(false);
  const [apiBadgeIds, setApiBadgeIds] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [ver, wallet, badges] = await Promise.all([
        getVerificationStatus(),
        authService.verifyWallet(),
        getMyBadges(),
      ]);
      setVerification(ver);
      setWalletRegistered(
        Boolean(wallet.has_wallet && (wallet.private_payout_wallet || wallet.wallet_address)),
      );
      setApiBadgeIds(badges.public_badges);
    } catch (e: unknown) {
      setVerification(null);
      setApiBadgeIds(null);
      setLoadError(e instanceof Error ? e.message : String(e));
      try {
        const ver = await getVerificationStatus();
        setVerification(ver);
      } catch {
        /* ignore */
      }
      try {
        const w = await authService.verifyWallet();
        setWalletRegistered(Boolean(w.has_wallet));
      } catch {
        setWalletRegistered(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const localFallback = computeEarnedBadgesLocal({
    verification,
    enterpriseMode: enterprise,
    walletRegistered,
    tasksCompleted: userStats?.tasks_completed ?? 0,
    tasksCreated: userStats?.tasks_created ?? 0,
  });

  const earned = mergeEarnedFromApi(apiBadgeIds ?? undefined, localFallback);

  const liveEntries = BADGE_CATALOG.filter((b) => b.live);
  const earnedCount = countEarnedLiveBadges(
    earned,
    liveEntries.map((b) => b.id),
  );

  return (
    <section className="settings-badges-catalog" aria-labelledby="settings-badges-heading">
      <header className="settings-badges-catalog__header">
        <h3 id="settings-badges-heading" className="settings-section-title">
          {t('badges.settings.title')}
        </h3>
        <p className="settings-section-lead">{t('badges.settings.lead')}</p>
        <p className="settings-badges-summary">
          {t('badges.settings.earnedCount').replace('{{earned}}', String(earnedCount)).replace(
            '{{live}}',
            String(liveEntries.length),
          )}
        </p>
        {loadError ? (
          <p className="settings-badges-load-error" role="status">
            {t('badges.settings.loadFallback')}
          </p>
        ) : null}
      </header>

      <div className="settings-badges-grid">
        {BADGE_CATALOG.map((badge) => {
          const isEarned = Boolean(earned[badge.id]);
          const isSoon = !badge.live && badge.availability === 'coming_soon';
          const dimmed = isSoon && !isEarned;

          return (
            <article
              key={badge.id}
              className={`settings-badge-card ${isEarned ? 'is-earned' : ''} ${dimmed ? 'is-soon' : ''}`}
            >
              <div className="settings-badge-card__visual">
                <img src={badge.image} alt="" className={dimmed ? 'is-muted' : ''} />
                {isSoon && !isEarned && (
                  <span className="settings-badge-card__lock" title={t('badges.settings.comingSoon')}>
                    <FaLock />
                  </span>
                )}
              </div>
              <div className="settings-badge-card__body">
                <h4>{t(badge.titleKey)}</h4>
                <p>{t(badge.howKey)}</p>
              </div>
              <footer className="settings-badge-card__footer">
                <span
                  className={`settings-badge-card__status ${
                    isEarned ? 'earned' : isSoon ? 'soon' : 'available'
                  }`}
                >
                  {isEarned
                    ? t('badges.settings.status.earned')
                    : isSoon
                      ? t('badges.settings.status.soon')
                      : t('badges.settings.status.available')}
                </span>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default SettingsBadgesCatalog;
