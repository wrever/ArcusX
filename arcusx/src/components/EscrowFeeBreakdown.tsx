import type { CSSProperties } from 'react';
import { clientFeePercents } from '../utils/escrowFeeDisplay';
import { useI18n } from '../i18n/I18nProvider';

type EscrowFeeBreakdownProps = {
  platformFee: number;
  totalUsdc?: string;
  platformUsdc?: string;
  protocolUsdc?: string;
  className?: string;
  layout?: 'stack' | 'escrow-rows' | 'flex-rows';
};

const flexRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid rgba(40, 192, 240, 0.2)',
};

const flexSubRowStyle: CSSProperties = {
  ...flexRowStyle,
  paddingLeft: '0.75rem',
  fontSize: '13px',
  opacity: 0.9,
};

/** Muestra 3% total y desglose 2.7% ArcusX + 0.3% costo de operación. */
const EscrowFeeBreakdown = ({
  platformFee,
  totalUsdc,
  platformUsdc,
  protocolUsdc,
  className = '',
  layout = 'stack',
}: EscrowFeeBreakdownProps) => {
  const { t } = useI18n();
  const p = clientFeePercents(platformFee);

  const totalLabel = t('fees.total.label').replace('{{p}}', p.totalPercent);
  const arcusxLabel = t('fees.arcusx.label').replace('{{p}}', p.platformPercent);
  const operationLabel = t('fees.operation.label').replace('{{p}}', p.protocolPercent);

  if (layout === 'escrow-rows') {
    return (
      <div className={className}>
        <div className="escrow-breakdown-row">
          <span>{totalLabel}</span>
          {totalUsdc != null ? <strong>{totalUsdc} USDC</strong> : null}
        </div>
        <div className="escrow-breakdown-row escrow-breakdown-sub">
          <span>{arcusxLabel}</span>
          {platformUsdc != null ? <strong>{platformUsdc} USDC</strong> : null}
        </div>
        <div className="escrow-breakdown-row escrow-breakdown-sub">
          <span>{operationLabel}</span>
          {protocolUsdc != null ? <strong>{protocolUsdc} USDC</strong> : null}
        </div>
      </div>
    );
  }

  if (layout === 'flex-rows') {
    return (
      <div className={className}>
        <div style={flexRowStyle}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{totalLabel}</span>
          {totalUsdc != null ? (
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{totalUsdc} USDC</strong>
          ) : null}
        </div>
        <div style={flexSubRowStyle}>
          <span style={{ color: 'var(--text-secondary)' }}>{arcusxLabel}</span>
          {platformUsdc != null ? (
            <strong style={{ color: 'var(--text-primary)' }}>{platformUsdc} USDC</strong>
          ) : null}
        </div>
        <div style={{ ...flexSubRowStyle, borderBottom: 'none' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{operationLabel}</span>
          {protocolUsdc != null ? (
            <strong style={{ color: 'var(--text-primary)' }}>{protocolUsdc} USDC</strong>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <p style={{ margin: 0 }}>
        {totalLabel}
        {totalUsdc != null ? `: ${totalUsdc} USDC` : ''}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: '0.9em', opacity: 0.85, paddingLeft: '0.75rem' }}>
        {arcusxLabel}
        {platformUsdc != null ? `: ${platformUsdc} USDC` : ''}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: '0.9em', opacity: 0.85, paddingLeft: '0.75rem' }}>
        {operationLabel}
        {protocolUsdc != null ? `: ${protocolUsdc} USDC` : ''}
      </p>
    </div>
  );
};

export default EscrowFeeBreakdown;
