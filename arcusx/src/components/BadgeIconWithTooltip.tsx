import { useId, useState } from 'react';
import { ARCUSX_BADGE_ASSETS, type ArcusxBadgeKey } from '../config/arcusxBadges';
import { BADGE_CATALOG } from '../config/badgeCatalog';
import { useI18n } from '../i18n/I18nProvider';
import '../css/BadgeIconWithTooltip.css';

type Props = {
  badgeId: ArcusxBadgeKey;
  size?: number;
  className?: string;
  dimmed?: boolean;
  /** Perfil público: texto objetivo sobre el logro; configuración: cómo obtenerlo. */
  tooltipContext?: 'profile' | 'settings';
};

const BadgeIconWithTooltip: React.FC<Props> = ({
  badgeId,
  size = 40,
  className = '',
  dimmed = false,
  tooltipContext = 'settings',
}) => {
  const { t } = useI18n();
  const [imgFailed, setImgFailed] = useState(false);
  const tipId = useId();
  const entry = BADGE_CATALOG.find((b) => b.id === badgeId);
  const src = ARCUSX_BADGE_ASSETS[badgeId];
  const title = entry ? t(entry.titleKey) : badgeId;
  const profileDescKey = `badges.catalog.${badgeId}.profile`;
  const description =
    tooltipContext === 'profile'
      ? t(profileDescKey, entry ? t(entry.howKey) : '')
      : entry
        ? t(entry.howKey)
        : '';

  return (
    <span
      className={`badge-icon-tooltip ${dimmed ? 'is-dimmed' : ''} ${className}`.trim()}
      tabIndex={0}
      aria-label={title}
      aria-describedby={description ? tipId : undefined}
    >
      {!imgFailed ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="badge-icon-tooltip__img"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="badge-icon-tooltip__fallback" style={{ width: size, height: size }}>
          ★
        </span>
      )}
      {(title || description) && (
        <span id={tipId} className="badge-icon-tooltip__card" role="tooltip">
          {title ? <strong className="badge-icon-tooltip__card-title">{title}</strong> : null}
          {description ? <span className="badge-icon-tooltip__card-desc">{description}</span> : null}
        </span>
      )}
    </span>
  );
};

export default BadgeIconWithTooltip;
