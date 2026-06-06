import { useState } from 'react';
import { KYC_BADGE_ASSETS, type VerificationBadgeKind } from '../config/arcusxBadges';
import { useI18n } from '../i18n/I18nProvider';
import '../css/VerifiedEnterpriseBadge.css';

type Props = {
  verified?: boolean;
  pending?: boolean;
  /** KYC persona vs KYB empresa (iconos distintos) */
  kind?: VerificationBadgeKind;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  title?: string;
};

const VerifiedEnterpriseBadge: React.FC<Props> = ({
  verified = false,
  pending = false,
  kind = 'enterprise',
  size = 'sm',
  showLabel = false,
  className = '',
  title: titleOverride,
}) => {
  const { t } = useI18n();
  const [imgFailed, setImgFailed] = useState(false);

  if (!verified && !pending) return null;
  if (pending && kind === 'individual') return null;

  const src = pending
    ? KYC_BADGE_ASSETS.enterprisePending
    : kind === 'enterprise'
      ? KYC_BADGE_ASSETS.enterpriseVerified
      : KYC_BADGE_ASSETS.individualVerified;

  const label = verified
    ? kind === 'enterprise'
      ? t('kyc.badge.verified.enterprise')
      : t('kyc.badge.verified.individual')
    : t('kyc.badge.pending');

  const tip =
    titleOverride ??
    (pending
      ? t('badges.catalog.clienteEmpresa.how')
      : kind === 'enterprise'
        ? t('badges.catalog.arcusxVerificadoEmpresa.how')
        : t('badges.catalog.arcusxVerificado.how'));

  const iconPx = size === 'lg' ? 44 : size === 'md' ? 20 : 16;

  return (
    <span
      className={`ax-verified-badge ax-verified-badge--${size} ax-verified-badge--${kind} ${verified ? 'is-verified' : 'is-pending'} ${className}`.trim()}
      title={tip}
      aria-label={label}
    >
      {!imgFailed ? (
        <img
          src={src}
          alt=""
          width={iconPx}
          height={iconPx}
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
