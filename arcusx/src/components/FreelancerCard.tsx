/**
 * FreelancerCard.tsx
 * Card horizontal "Upwork + Web3": identidad wallet + señales de confianza + stats rápidos.
 */

import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaBolt, FaStar, FaLock } from 'react-icons/fa';
import RatingDisplay from './RatingDisplay';
import { useI18n } from '../i18n/I18nProvider';
import type { Freelancer } from '../types/freelancer';
import { getAvatarUrl } from '../utils/avatarUtils';
import { getFreelancerSignals } from '../utils/web3Identity';
import '../css/FreelancerCard.css';

interface FreelancerCardProps {
  freelancer: Freelancer;
}

const FreelancerCard = memo(({ freelancer }: FreelancerCardProps) => {
  const { t } = useI18n();

  const getInitials = (name: string): string => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const truncatedBio = useMemo(() => {
    const maxLength = 120;
    if (!freelancer.bio) return t('freelancers.card.no.bio');
    if (freelancer.bio.length <= maxLength) return freelancer.bio;
    return freelancer.bio.substring(0, maxLength).trim() + '...';
  }, [freelancer.bio, t]);

  const avatarUrl = useMemo(
    () => (freelancer.avatar_url ? getAvatarUrl(freelancer.avatar_url) : null),
    [freelancer.avatar_url]
  );

  const signals = useMemo(() => getFreelancerSignals(freelancer), [freelancer]);

  const skills = useMemo(() => {
    const list = freelancer.skills || [];
    const visible = list.slice(0, 4);
    const more = Math.max(0, list.length - visible.length);
    return { visible, more };
  }, [freelancer.skills]);

  const profileUrl = `/profile/${freelancer.id}`;

  return (
    <div className="freelancer-card-horizontal" aria-label={`Freelancer ${freelancer.username}`}>
      <div className="freelancer-card-avatar-section">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Avatar de ${freelancer.username} - Freelancer en ArcusX`}
            className="freelancer-avatar-image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="freelancer-avatar-placeholder" aria-hidden="true">
            {getInitials(freelancer.username)}
          </div>
        )}
      </div>

      <div className="freelancer-card-content">
        <div className="freelancer-card-header">
          <div className="freelancer-name-row">
            <h3 className="freelancer-name">{freelancer.username}</h3>

            {signals.isVerified && (
              <span className="freelancer-badge verified" title={t('freelancers.badge.verified')}>
                <FaCheckCircle />
                {t('freelancers.badge.verified')}
              </span>
            )}

            <span className="freelancer-badge escrow" title={t('freelancers.badge.escrow')}>
              <FaLock />
              {t('freelancers.badge.escrow')}
            </span>

            {signals.badges.includes('fastResponder') && (
              <span className="freelancer-badge fast" title={t('freelancers.badge.fast')}>
                <FaBolt />
                {t('freelancers.badge.fast')}
              </span>
            )}

            {signals.badges.includes('topRated') && (
              <span className="freelancer-badge top" title={t('freelancers.badge.top')}>
                <FaStar />
                {t('freelancers.badge.top')}
              </span>
            )}
          </div>

          <div className="freelancer-sub-row">
            <span className="freelancer-wallet" title={signals.wallet}>
              {signals.walletShort}
            </span>
            <span className="freelancer-joined">
              {t('freelancers.card.joined')} {new Date(freelancer.joined_date).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="freelancer-card-metrics">
          <div className="freelancer-metric">
            <span className="metric-label">{t('freelancers.metric.delivery')}</span>
            <span className="metric-value">
              {signals.avgDeliveryDays} {t('freelancers.metric.days')}
            </span>
          </div>
          <div className="freelancer-metric">
            <span className="metric-label">{t('freelancers.metric.jobs')}</span>
            <span className="metric-value">{freelancer.tasks_completed}</span>
          </div>
          <div className="freelancer-metric">
            <span className="metric-label">{t('freelancers.metric.disputes')}</span>
            <span className="metric-value">{signals.disputeRatePct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="freelancer-card-body">
          <RatingDisplay rating={freelancer.average_rating} totalRatings={freelancer.total_ratings} />
          <p className="freelancer-bio">{truncatedBio}</p>

          {skills.visible.length > 0 && (
            <div className="freelancer-skills">
              {skills.visible.map((s) => (
                <span key={s} className="skill-chip">
                  {s}
                </span>
              ))}
              {skills.more > 0 && <span className="skill-chip more">+{skills.more}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="freelancer-card-footer">
        <Link to={profileUrl} className="freelancer-view-profile-btn">
          {t('freelancers.card.view.profile')}
        </Link>
        <Link to={`${profileUrl}?hire=1`} className="freelancer-hire-btn">
          {t('freelancers.card.hire')}
        </Link>
      </div>
    </div>
  );
});

FreelancerCard.displayName = 'FreelancerCard';

export default FreelancerCard;
