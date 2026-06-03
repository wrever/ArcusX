import { BADGE_CATALOG } from '../config/badgeCatalog';
import type { ArcusxBadgeKey } from '../config/arcusxBadges';
import BadgeIconWithTooltip from './BadgeIconWithTooltip';
import { useI18n } from '../i18n/I18nProvider';
import '../css/ProfilePublicBadges.css';

type Props = {
  badgeIds?: string[];
  /** Iconos en fila junto al nombre del perfil (sin título ni descripciones). */
  variant?: 'inline';
  className?: string;
  iconSize?: number;
};

const ProfilePublicBadges: React.FC<Props> = ({
  badgeIds = [],
  variant = 'inline',
  className = '',
  iconSize = 34,
}) => {
  const { t } = useI18n();
  const earnedSet = new Set(badgeIds);
  const earned = BADGE_CATALOG.filter((b) => earnedSet.has(b.id));

  if (earned.length === 0) return null;

  if (variant === 'inline') {
    return (
      <ul
        className={`profile-public-badges profile-public-badges--inline ${className}`.trim()}
        aria-label={t('profile.badges.title')}
      >
        {earned.map((badge) => (
          <li key={badge.id}>
            <BadgeIconWithTooltip
              badgeId={badge.id as ArcusxBadgeKey}
              size={iconSize}
              tooltipContext="profile"
            />
          </li>
        ))}
      </ul>
    );
  }

  return null;
};

export default ProfilePublicBadges;
