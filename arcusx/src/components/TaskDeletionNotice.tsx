import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import {
  formatCountdownParts,
  getTaskDeletionSchedule,
  type TaskClosureHints,
  type TaskDeletionFields,
} from '../utils/taskDeletionSchedule';
import '../css/TaskDeletionNotice.css';

interface TaskDeletionNoticeProps {
  scheduledDeletionAt?: string | null;
  completedAt?: string | null;
  escrowStatus?: string | null;
  status?: string | null;
  escrowReleaseTxHash?: string | null;
  clientAcceptedCompletion?: number | boolean | null;
  disputeResolvedAt?: string | null;
  closureHints?: TaskClosureHints;
  variant?: 'banner' | 'inline' | 'compact';
  className?: string;
}

const TaskDeletionNotice = ({
  scheduledDeletionAt,
  completedAt,
  escrowStatus,
  status,
  escrowReleaseTxHash,
  clientAcceptedCompletion,
  disputeResolvedAt,
  closureHints,
  variant = 'banner',
  className,
}: TaskDeletionNoticeProps) => {
  const { t, lang } = useI18n();

  const taskFields: TaskDeletionFields = useMemo(
    () => ({
      status,
      escrow_status: escrowStatus,
      scheduled_deletion_at: scheduledDeletionAt,
      completed_at: completedAt,
      escrow_completed_at: completedAt,
      escrow_release_tx_hash: escrowReleaseTxHash,
      client_accepted_completion: clientAcceptedCompletion,
      dispute_resolved_at: disputeResolvedAt,
    }),
    [
      status,
      escrowStatus,
      scheduledDeletionAt,
      completedAt,
      escrowReleaseTxHash,
      clientAcceptedCompletion,
      disputeResolvedAt,
    ],
  );

  const schedule = useMemo(
    () => getTaskDeletionSchedule(taskFields, closureHints ?? {}),
    [taskFields, closureHints],
  );

  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!schedule) {
      setRemainingMs(null);
      return;
    }

    const tick = () => setRemainingMs(Math.max(0, schedule.targetMs - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [schedule]);

  if (!schedule || remainingMs === null) return null;

  const parts = formatCountdownParts(remainingMs);
  const deleteAtLabel = new Date(schedule.targetMs).toLocaleString(
    lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'es-ES',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  );

  const rootClass = [
    'task-deletion-banner',
    variant === 'inline' ? 'task-deletion-banner--inline' : '',
    variant === 'compact' ? 'task-deletion-banner--compact' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} role="status" aria-live="polite">
      <p className="task-deletion-banner__title">{t('supervise.deletion.bannerTitle')}</p>
      <p className="task-deletion-banner__subtitle">
        {schedule.windowHours === 12
          ? t('supervise.popup.taskDeleted12h')
          : t('supervise.popup.taskDeleted24h')}
      </p>

      {parts.done ? (
        <p className="task-deletion-banner__done">{t('supervise.deletion.done')}</p>
      ) : (
        <>
          <div className="task-deletion-banner__countdown-row">
            <span className="task-deletion-banner__label">
              {t('supervise.deletion.countdownLabel')}
            </span>
            <div className="task-deletion-countdown" aria-label={t('supervise.deletion.countdownLabel')}>
              <div className="task-deletion-countdown__unit">
                <span className="task-deletion-countdown__value">{parts.hours}</span>
                <span className="task-deletion-countdown__name">{t('supervise.deletion.hours')}</span>
              </div>
              <span className="task-deletion-countdown__sep" aria-hidden>
                :
              </span>
              <div className="task-deletion-countdown__unit">
                <span className="task-deletion-countdown__value">{parts.minutes}</span>
                <span className="task-deletion-countdown__name">{t('supervise.deletion.minutes')}</span>
              </div>
              <span className="task-deletion-countdown__sep" aria-hidden>
                :
              </span>
              <div className="task-deletion-countdown__unit">
                <span className="task-deletion-countdown__value">{parts.seconds}</span>
                <span className="task-deletion-countdown__name">{t('supervise.deletion.seconds')}</span>
              </div>
            </div>
          </div>
          <p className="task-deletion-banner__datetime">
            {t('supervise.deletion.atTime').replace('{{datetime}}', deleteAtLabel)}
          </p>
        </>
      )}
    </div>
  );
};

export default TaskDeletionNotice;
