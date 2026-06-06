/**
 * FreelancerCard.tsx
 * Card horizontal: nombre, verificado, rating, bio, habilidades y CTAs.
 */

import { memo, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import UsernameWithVerified from './UsernameWithVerified';
import RatingDisplay from './RatingDisplay';
import { useI18n } from '../i18n/I18nProvider';
import type { Freelancer } from '../types/freelancer';
import { getAvatarUrl } from '../utils/avatarUtils';
import { normalizeDisplayText } from '../utils/utf8Mojibake';
import '../css/FreelancerCard.css';

interface FreelancerCardProps {
  freelancer: Freelancer;
}

const FreelancerCard = memo(({ freelancer }: FreelancerCardProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();

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
    const bio = normalizeDisplayText(freelancer.bio);
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength).trim() + '...';
  }, [freelancer.bio, t]);

  const avatarUrl = useMemo(
    () => (freelancer.avatar_url ? getAvatarUrl(freelancer.avatar_url) : null),
    [freelancer.avatar_url]
  );

  const verifiedEnterprise = useMemo(
    () =>
      Boolean(
        freelancer.creator_verified_enterprise ||
          freelancer.public_badges?.includes('arcusxVerificadoEmpresa'),
      ),
    [freelancer],
  );
  const verifiedIndividual = useMemo(
    () =>
      Boolean(
        freelancer.creator_verified_individual ||
          freelancer.public_badges?.includes('arcusxVerificado'),
      ),
    [freelancer],
  );

  const skills = useMemo(() => {
    const list = freelancer.skills || [];
    const visible = list.slice(0, 4);
    const more = Math.max(0, list.length - visible.length);
    return { visible, more };
  }, [freelancer.skills]);

  const profileUrl = `/profile/${freelancer.id}`;

  const handleHire = () => {
    const firstSkill = skills.visible[0];
    const skillLabel = typeof firstSkill === 'string' ? firstSkill : (firstSkill && typeof firstSkill === 'object' && 'name' in firstSkill ? (firstSkill as { name: string }).name : undefined);
    const params = new URLSearchParams();
    params.set('for_user', String(freelancer.id));
    params.set('hire_username', encodeURIComponent(freelancer.username));
    if (skillLabel) params.set('hire_skill', encodeURIComponent(skillLabel));
    navigate(
      { pathname: '/create-task', search: params.toString() },
      {
        state: {
          hireContext: {
            userId: freelancer.id,
            username: freelancer.username,
            skill: skillLabel,
          },
        },
      }
    );
  };

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
            <h3 className="freelancer-name">
              <UsernameWithVerified
                name={freelancer.display_name || freelancer.username}
                verifiedEnterprise={verifiedEnterprise}
                verifiedIndividual={verifiedIndividual}
                richTooltip
                tooltipPlacement="below"
                nameClassName="freelancer-name-text"
              />
            </h3>
          </div>
        </div>

        <div className="freelancer-card-body">
          <RatingDisplay averageRating={freelancer.average_rating} totalRatings={freelancer.total_ratings} />
          <p className="freelancer-bio">{truncatedBio}</p>

          {skills.visible.length > 0 && (
            <div className="freelancer-skills">
              {skills.visible.map((s, idx) => {
                const label = typeof s === 'string' ? s : (s && typeof s === 'object' && 'name' in s ? (s as { name: string }).name : String(s));
                const key = typeof s === 'string' ? s : (s && typeof s === 'object' && 'name' in s ? `skill-${(s as { name: string }).name}-${idx}` : `skill-${idx}`);
                return (
                  <span key={key} className="skill-chip">
                    {label}
                  </span>
                );
              })}
              {skills.more > 0 && <span className="skill-chip more">+{skills.more}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="freelancer-card-footer">
        <Link to={profileUrl} className="freelancer-view-profile-btn">
          {t('freelancers.card.view.profile')}
        </Link>
        {freelancer.has_payout_wallet ? (
          <button type="button" onClick={handleHire} className="freelancer-hire-btn">
            <FaPlus style={{ marginRight: '6px', fontSize: '12px' }} />
            {t('freelancers.card.hire')}
          </button>
        ) : null}
      </div>
    </div>
  );
});

FreelancerCard.displayName = 'FreelancerCard';

export default FreelancerCard;
