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
        <div className="complete-popup-fee-row">
          <span className="complete-popup-fee-label">{totalLabel}</span>
          {totalUsdc != null ? (
            <strong className="complete-popup-fee-value">{totalUsdc} USDC</strong>
          ) : null}
        </div>
        <div className="complete-popup-fee-row complete-popup-fee-row--sub">
          <span className="complete-popup-fee-label">{arcusxLabel}</span>
          {platformUsdc != null ? (
            <strong className="complete-popup-fee-value">{platformUsdc} USDC</strong>
          ) : null}
        </div>
        <div className="complete-popup-fee-row complete-popup-fee-row--sub complete-popup-fee-row--last">
          <span className="complete-popup-fee-label">{operationLabel}</span>
          {protocolUsdc != null ? (
            <strong className="complete-popup-fee-value">{protocolUsdc} USDC</strong>
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
      <p className="arcusx-inline-hint" style={{ paddingLeft: '0.75rem' }}>
        {arcusxLabel}
        {platformUsdc != null ? `: ${platformUsdc} USDC` : ''}
      </p>
      <p className="arcusx-inline-hint" style={{ marginTop: '2px', paddingLeft: '0.75rem' }}>
        {operationLabel}
        {protocolUsdc != null ? `: ${protocolUsdc} USDC` : ''}
      </p>
    </div>
  );
};

export default EscrowFeeBreakdown;
