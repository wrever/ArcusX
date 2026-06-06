import { FaExternalLinkAlt } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { isStellarTxHash, stellarExpertTxUrl } from '../utils/stellarNetwork';

interface StellarTxHashLinkProps {
  txHash: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

const StellarTxHashLink = ({
  txHash,
  label,
  compact = true,
  className,
}: StellarTxHashLinkProps) => {
  const { t } = useI18n();
  const hash = txHash.trim();
  if (!isStellarTxHash(hash)) return null;

  const display = compact
    ? `${hash.slice(0, 10)}…${hash.slice(-10)}`
    : hash;

  return (
    <div className={className} style={{ marginTop: label ? '8px' : 0 }}>
      {label ? (
        <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
          <strong style={{ color: '#10dd88' }}>{label}</strong>
        </p>
      ) : null}
      <a
        href={stellarExpertTxUrl(hash)}
        target="_blank"
        rel="noopener noreferrer"
        title={t('supervise.status.viewOnStellarExpert')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#10dd88',
          background: 'rgba(16, 221, 136, 0.1)',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(16, 221, 136, 0.25)',
          wordBreak: 'break-all',
          textDecoration: 'none',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          cursor: 'pointer',
          transition: 'background 0.2s ease, border-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(16, 221, 136, 0.18)';
          e.currentTarget.style.borderColor = 'rgba(16, 221, 136, 0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(16, 221, 136, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(16, 221, 136, 0.25)';
        }}
      >
        <span>{display}</span>
        <FaExternalLinkAlt aria-hidden style={{ flexShrink: 0, fontSize: '11px', opacity: 0.9 }} />
      </a>
    </div>
  );
};

export default StellarTxHashLink;
