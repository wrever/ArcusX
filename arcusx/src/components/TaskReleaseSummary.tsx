import { useI18n } from '../i18n/I18nProvider';
import StellarTxHashLink from './StellarTxHashLink';
interface TaskReleaseSummaryProps {
  txHash?: string | null;
  variant?: 'client' | 'worker';
}

const TaskReleaseSummary = ({
  txHash,
  variant = 'client',
}: TaskReleaseSummaryProps) => {
  const { t } = useI18n();

  const message = variant === 'worker'
    ? t('supervise.status.paymentReceived')
    : t('supervise.status.fundsReleasedSuccess');

  const subMessage = variant === 'worker'
    ? t('supervise.status.taskCompletedCheckWallet')
    : null;

  return (
    <div
      style={{
        marginBottom: '12px',
        padding: '15px',
        backgroundColor: 'rgba(16, 221, 136, 0.12)',
        borderRadius: '8px',
        border: '2px solid rgba(16, 221, 136, 0.35)',
      }}
    >
      <p style={{ margin: 0, color: '#10dd88', fontSize: '14px', fontWeight: 'bold' }}>
        {message}
      </p>
      {subMessage ? (
        <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
          {subMessage}
        </p>
      ) : null}
      {txHash ? (
        <StellarTxHashLink
          txHash={txHash}
          label={t('supervise.status.releaseTxHash')}
        />
      ) : null}
    </div>
  );
};

export default TaskReleaseSummary;
