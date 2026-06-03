import { useState } from 'react';
import { KYC_BADGE_ASSETS } from '../config/arcusxBadges';
import { useI18n } from '../i18n/I18nProvider';
import '../css/VerifiedEnterpriseBadge.css';

type Props = {
  verified?: boolean;
  pending?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  /** Tooltip nativo (hover); si no se pasa, usa el label i18n */
  title?: string;
};

const VerifiedEnterpriseBadge: React.FC<Props> = ({
  verified = false,
  pending = false,
  size = 'sm',
  showLabel = false,
  className = '',
  title: titleOverride,
}) => {
  const { t } = useI18n();
  const [imgFailed, setImgFailed] = useState(false);

  if (!verified && !pending) return null;

  const src = verified
    ? KYC_BADGE_ASSETS.enterpriseVerified
    : KYC_BADGE_ASSETS.enterprisePending;
  const label = verified
    ? t('kyc.badge.verified')
    : t('kyc.badge.pending');
  const tip = titleOverride ?? (verified ? t('badges.catalog.arcusxVerificado.how') : t('badges.catalog.clienteEmpresa.how'));

  return (
    <span
      className={`ax-verified-badge ax-verified-badge--${size} ${verified ? 'is-verified' : 'is-pending'} ${className}`.trim()}
      title={tip}
      aria-label={label}
    >
      {!imgFailed ? (
        <img
          src={src}
          alt=""
          className="ax-verified-badge__icon"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="ax-verified-badge__fallback" aria-hidden>
          {verified ? '✓' : '…'}
        </span>
      )}
      {showLabel && <span className="ax-verified-badge__label">{label}</span>}
    </span>
  );
};

export default VerifiedEnterpriseBadge;
