/**
 * FreelancerCard.tsx
 * Componente horizontal para mostrar información resumida de un freelancer
 */

import { Link } from 'react-router-dom';
import RatingDisplay from './RatingDisplay';
import { useI18n } from '../i18n/I18nProvider';
import type { Freelancer } from '../types/freelancer';
import '../css/FreelancerCard.css';

interface FreelancerCardProps {
  freelancer: Freelancer;
}

const FreelancerCard = ({ freelancer }: FreelancerCardProps) => {
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

  // Truncar descripción a máximo 120 caracteres
  const truncateBio = (bio: string | null | undefined, maxLength: number = 120): string => {
    if (!bio) return t('freelancers.card.no.bio');
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength).trim() + '...';
  };

  const avatarUrl = freelancer.avatar_url 
    ? `${import.meta.env.VITE_API_URL || ''}${freelancer.avatar_url}`
    : null;

  return (
    <div className="freelancer-card-horizontal">
      <div className="freelancer-card-avatar-section">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={freelancer.username}
            className="freelancer-avatar-image"
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
            {truncateBio(freelancer.bio)}
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
};

export default FreelancerCard;

