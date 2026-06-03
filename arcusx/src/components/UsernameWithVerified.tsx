import { Link } from 'react-router-dom';
import VerifiedEnterpriseBadge from './VerifiedEnterpriseBadge';
import { useI18n } from '../i18n/I18nProvider';
import '../css/UsernameWithVerified.css';

type Props = {
  name: string;
  userId?: number;
  verified?: boolean;
  pending?: boolean;
  linkToProfile?: boolean;
  className?: string;
  nameClassName?: string;
};

/** Nombre de usuario con badge verificado a la derecha (icono + tooltip). */
const UsernameWithVerified: React.FC<Props> = ({
  name,
  userId,
  verified = false,
  pending = false,
  linkToProfile = false,
  className = '',
  nameClassName = '',
}) => {
  const { t } = useI18n();
  const label = (name || '').trim();
  if (!label) return null;

  const tip = verified
    ? t('badges.catalog.arcusxVerificado.how')
    : pending
      ? t('badges.catalog.clienteEmpresa.how')
      : undefined;

  const nameEl = <span className={`username-with-verified__name ${nameClassName}`.trim()}>{label}</span>;

  const inner = (
    <>
      {nameEl}
      <VerifiedEnterpriseBadge
        verified={verified}
        pending={pending}
        size="sm"
        showLabel={false}
        className="username-with-verified__badge"
        title={tip}
      />
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
