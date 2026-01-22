/**
 * FreelancerCard.tsx
 * Componente horizontal para mostrar información resumida de un freelancer
 */

import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import RatingDisplay from './RatingDisplay';
import { useI18n } from '../i18n/I18nProvider';
import type { Freelancer } from '../types/freelancer';
import { getAvatarUrl } from '../utils/avatarUtils';
import '../css/FreelancerCard.css';

interface FreelancerCardProps {
  freelancer: Freelancer;
}

const FreelancerCard = memo(({ freelancer }: FreelancerCardProps) => {
  const { t } = useI18n();
  
  // Función para obtener iniciales del nombre
  const getInitials = (username: string): string => {
    return username
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Truncar descripción a máximo 120 caracteres - Memoizado
  const truncatedBio = useMemo(() => {
    const maxLength = 120;
    if (!freelancer.bio) return t('freelancers.card.no.bio');
    if (freelancer.bio.length <= maxLength) return freelancer.bio;
    return freelancer.bio.substring(0, maxLength).trim() + '...';
  }, [freelancer.bio, t]);

  const avatarUrl = useMemo(() => 
    freelancer.avatar_url ? getAvatarUrl(freelancer.avatar_url) : null,
    [freelancer.avatar_url]
  );

  return (
    <div className="freelancer-card-horizontal">
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
          <div className="freelancer-avatar-placeholder">
            {getInitials(freelancer.username)}
          </div>
        )}
      </div>

      <div className="freelancer-card-content">
        <div className="freelancer-card-header">
          <div className="freelancer-info">
            <h3 className="freelancer-username">{freelancer.username}</h3>
            <div className="freelancer-rating">
              <RatingDisplay
                averageRating={freelancer.average_rating}
                totalRatings={freelancer.total_ratings}
                size="small"
              />
            </div>
          </div>
        </div>

        <div className="freelancer-card-body">
          <p className="freelancer-bio">
            {truncatedBio}
          </p>
        </div>
      </div>

      <div className="freelancer-card-footer">
        <Link 
          to={`/profile/${freelancer.id}`}
          className="freelancer-view-profile-btn"
        >
          {t('freelancers.card.view.profile')}
        </Link>
      </div>
    </div>
  );
});

FreelancerCard.displayName = 'FreelancerCard';

export default FreelancerCard;

