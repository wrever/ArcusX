import { Link } from 'react-router-dom';
import VerifiedEnterpriseBadge from './VerifiedEnterpriseBadge';
import BadgeIconWithTooltip from './BadgeIconWithTooltip';
import type { ArcusxBadgeKey, VerificationBadgeKind } from '../config/arcusxBadges';
import { useI18n } from '../i18n/I18nProvider';
import '../css/UsernameWithVerified.css';

function verificationBadgeId(
  kind: VerificationBadgeKind,
  pending?: boolean,
): ArcusxBadgeKey {
  if (pending) return 'clienteEmpresa';
  return kind === 'enterprise' ? 'arcusxVerificadoEmpresa' : 'arcusxVerificado';
}

type Props = {
  name: string;
  userId?: number;
  /** @deprecated Usar verifiedEnterprise / verifiedIndividual */
  verified?: boolean;
  verifiedEnterprise?: boolean;
  verifiedIndividual?: boolean;
  pending?: boolean;
  linkToProfile?: boolean;
  /** Tarjeta explicativa al hover (listado freelancers) */
  richTooltip?: boolean;
  /** Tarjetas de tarea / listados estrechos: icono ~18px, sin tooltip grande */
  compact?: boolean;
  tooltipPlacement?: 'above' | 'below';
  className?: string;
  nameClassName?: string;
};

/** Nombre con badge KYC (persona) o KYB (empresa) a la derecha. */
const UsernameWithVerified: React.FC<Props> = ({
  name,
  userId,
  verified,
  verifiedEnterprise,
  verifiedIndividual,
  pending = false,
  linkToProfile = false,
  richTooltip = false,
  compact = false,
  tooltipPlacement = 'above',
  className = '',
  nameClassName = '',
}) => {
  const { t } = useI18n();
  const label = (name || '').trim();
  if (!label) return null;

  const entVerified = verifiedEnterprise ?? false;
  const indVerified = verifiedIndividual ?? (verified && !entVerified);
  const entPending = pending && !entVerified && !indVerified;

  const badges: { kind: VerificationBadgeKind; verified: boolean; pending?: boolean; tip?: string }[] = [];
  if (entVerified) {
    badges.push({
      kind: 'enterprise',
      verified: true,
      tip: t('badges.catalog.arcusxVerificadoEmpresa.how'),
    });
  } else if (indVerified) {
    badges.push({
      kind: 'individual',
      verified: true,
      tip: t('badges.catalog.arcusxVerificado.how'),
    });
  } else if (entPending) {
    badges.push({
      kind: 'enterprise',
      verified: false,
      pending: true,
      tip: t('badges.catalog.clienteEmpresa.how'),
    });
  }

  const nameEl = <span className={`username-with-verified__name ${nameClassName}`.trim()}>{label}</span>;

  const inner = (
    <>
      {nameEl}
      {badges.map((b) => {
        const key = b.kind + (b.pending ? '-pending' : '-ok');
        if (richTooltip) {
          return (
            <BadgeIconWithTooltip
              key={key}
              badgeId={verificationBadgeId(b.kind, b.pending)}
              size={22}
              tooltipContext="profile"
              placement={tooltipPlacement}
              className="username-with-verified__badge"
            />
          );
        }
        if (compact) {
          return (
            <BadgeIconWithTooltip
              key={key}
              badgeId={verificationBadgeId(b.kind, b.pending)}
              size={18}
              tooltipContext="profile"
              placement={tooltipPlacement}
              showCard={false}
              className="username-with-verified__badge username-with-verified__badge--compact"
              title={b.tip}
            />
          );
        }
        return (
          <VerifiedEnterpriseBadge
            key={key}
            kind={b.kind}
            verified={b.verified}
            pending={b.pending}
            size="sm"
            showLabel={false}
            className="username-with-verified__badge"
            title={b.tip}
          />
        );
      })}
    </>
  );

  if (linkToProfile && userId) {
    return (
      <span className={`username-with-verified ${className}`.trim()}>
        <Link to={`/profile/${userId}`} className="username-with-verified__link" onClick={(e) => e.stopPropagation()}>
          {inner}
        </Link>
      </span>
    );
  }

  return <span className={`username-with-verified ${className}`.trim()}>{inner}</span>;
};

export default UsernameWithVerified;
