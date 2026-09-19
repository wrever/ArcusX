import { useMemo } from 'react';
import {
  FaCheckCircle,
  FaFolderOpen,
  FaHandshake,
  FaShieldAlt,
} from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import PrivateOfferRefundButton from './PrivateOfferRefundButton';
import TaskDeletionNotice from './TaskDeletionNotice';
import { clientCanSuperviseAcceptedTask } from '../utils/escrowStatus';
import {
  isTrustlessWorkContractId,
  parsePrivateOfferTwRow,
  resolveSentOfferDisplayPhase,
  sentOfferDeletionScheduleAt,
  type PrivateOfferTwRow,
  type SentOfferTaskFields,
} from '../utils/privateOfferChainState';
import '../css/SentPrivateOfferCard.css';

export type SentPrivateOfferTask = SentOfferTaskFields & {
  id: number;
  title: string;
  subtitle: string;
  invited_worker_username?: string | null;
  invited_user_id?: number | null;
  user_id?: number | null;
};

interface SentPrivateOfferCardProps {
  task: SentPrivateOfferTask;
  twRow?: PrivateOfferTwRow | null;
  chainLoaded: boolean;
  onRefresh: () => void;
  onRefreshChain: () => void;
  onSupervise: (
    taskId: number,
    acceptedApplicantId: number | null | undefined,
    escrowStatus?: string | null,
    escrowId?: string | null,
    fundTxHash?: string | null,
    readyForSupervision?: boolean,
    invitedUserId?: number | null,
    taskOwnerUserId?: number | null,
  ) => void;
}

function shouldShowPrivateOfferAwaiting(task: SentPrivateOfferTask): boolean {
  if (task.status === 'private_offer_rejected') return false;
  if (task.cancellation_tx_hash) return false;
  if (task.accepted_applicant_id) return false;
  if (task.has_accepted_proposal) return false;
  if (task.status === 'assigned' || task.status === 'in_progress') return false;
  return Boolean(task.awaiting_private_worker);
}

function hadFundedWork(task: SentPrivateOfferTask): boolean {
  return (
    Boolean(task.accepted_applicant_id) &&
    Boolean(String(task.escrow_fund_tx_hash ?? '').trim()) &&
    Boolean(String(task.escrow_id ?? '').trim())
  );
}

const SentPrivateOfferCard = ({
  task,
  twRow,
  chainLoaded,
  onRefresh,
  onRefreshChain,
  onSupervise,
}: SentPrivateOfferCardProps) => {
  const { t } = useI18n();

  const chain = useMemo(() => parsePrivateOfferTwRow(twRow), [twRow]);
  const phase = useMemo(
    () => resolveSentOfferDisplayPhase(task, chain, chainLoaded),
    [task, chain, chainLoaded],
  );

  const displayPhase =
    phase === 'active' && shouldShowPrivateOfferAwaiting(task) ? 'awaiting' : phase;

  const deletionScheduleAt = useMemo(() => {
    if (phase !== 'funds_released') return null;
    const escrowSt = String(task.escrow_status ?? '').toLowerCase();
    const windowHours: 12 | 24 =
      task.status === 'completed' || escrowSt === 'completed' ? 12 : 24;
    return sentOfferDeletionScheduleAt(task, windowHours);
  }, [phase, task]);

  const superviseEscrowStatus =
    phase === 'refund_pending' || chain.isDisputed ? 'disputed' : task.escrow_status;

  const showSuperviseActive =
    task.has_accepted_proposal ||
    clientCanSuperviseAcceptedTask(
      task.accepted_applicant_id,
      task.escrow_id,
      task.escrow_status,
      task.escrow_fund_tx_hash,
    );

  const canOpenSupervise =
    showSuperviseActive || (phase === 'funds_released' && hadFundedWork(task));

  const superviseLabel =
    phase === 'funds_released'
      ? t('dashboard.privateOffers.sent.viewDelivery')
      : superviseEscrowStatus?.toLowerCase() === 'disputed'
        ? t('dashboard.manage.tasks.supervise.dispute')
        : t('dashboard.manage.tasks.supervise');

  const phaseBadge = useMemo(() => {
    switch (displayPhase) {
      case 'refund_pending':
        return t('dashboard.privateOffers.sent.badgePending');
      case 'funds_released':
        return t('dashboard.privateOffers.sent.badgeReleased');
      case 'awaiting':
        return t('dashboard.privateOffers.sent.badgeAwaiting');
      case 'refund_button':
        return t('dashboard.privateOffers.sent.badgeRefund');
      default:
        return t('dashboard.privateOffers.sent.badgeActive');
    }
  }, [displayPhase, t]);

  const openSupervise = () => {
    onSupervise(
      task.id,
      task.accepted_applicant_id,
      superviseEscrowStatus,
      task.escrow_id,
      task.escrow_fund_tx_hash,
      true,
      task.invited_user_id,
      task.user_id,
    );
  };

  return (
    <article className={`sent-offer-card sent-offer-card--${displayPhase}`}>
      <header className="sent-offer-card__header">
        <div className="sent-offer-card__titles">
          <h3 className="sent-offer-card__title">{task.title}</h3>
          {task.subtitle ? (
            <p className="sent-offer-card__subtitle">{task.subtitle}</p>
          ) : null}
        </div>
        <span className="sent-offer-card__phase-badge">{phaseBadge}</span>
      </header>

      <div className="sent-offer-card__body">
        {phase === 'refund_button' ? (
          <div className="sent-offer-card__refund-slot">
            <PrivateOfferRefundButton
              taskId={task.id}
              onRefunded={() => {
                onRefresh();
                void onRefreshChain();
              }}
            />
          </div>
        ) : null}

        {phase === 'refund_pending' ? (
          <div className="sent-offer-card__notice" role="status">
            <span className="sent-offer-card__notice-icon" aria-hidden>
              <FaShieldAlt />
            </span>
            <p className="sent-offer-card__notice-text">
              {t('dashboard.privateOffers.sent.refundPending')}
            </p>
          </div>
        ) : null}

        {phase === 'funds_released' ? (
          <>
            <div className="sent-offer-card__notice" role="status">
              <span className="sent-offer-card__notice-icon" aria-hidden>
                <FaCheckCircle />
              </span>
              <p className="sent-offer-card__notice-text">
                {String(task.status ?? '').toLowerCase() === 'completed'
                  ? t('dashboard.privateOffers.sent.workComplete')
                  : t('dashboard.privateOffers.sent.refundComplete')}
              </p>
            </div>
            {deletionScheduleAt ? (
              <div className="sent-offer-card__countdown">
                <TaskDeletionNotice
                  variant="compact"
                  scheduledDeletionAt={deletionScheduleAt}
                  completedAt={
                    task.completed_at ??
                    task.escrow_completed_at ??
                    task.cancellation_requested_at
                  }
                  escrowStatus={chain.isReleased ? 'refunded' : task.escrow_status}
                  status={task.status}
                  escrowReleaseTxHash={task.escrow_release_tx_hash}
                  closureHints={{
                    isRefunded: true,
                    onChainFundsReleased:
                      chain.isReleased || isTrustlessWorkContractId(task.escrow_id),
                  }}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {displayPhase === 'active' ? (
          <div className="sent-offer-card__notice" role="status">
            <span className="sent-offer-card__notice-icon" aria-hidden>
              <FaHandshake />
            </span>
            <p className="sent-offer-card__notice-text">
              {task.invited_worker_username
                ? t('dashboard.privateOffers.sent.activeInProgressNamed').replace(
                    '{{name}}',
                    task.invited_worker_username,
                  )
                : t('dashboard.privateOffers.sent.activeInProgress')}
            </p>
          </div>
        ) : null}

        {displayPhase === 'awaiting' ? (
          <div className="sent-offer-card__awaiting" role="status" aria-live="polite">
            <span className="sent-offer-card__awaiting-label">
              {t('dashboard.manage.tasks.privateOffer.badge')}
            </span>
            <span className="sent-offer-card__awaiting-msg">
              {task.invited_worker_username
                ? t('dashboard.manage.tasks.privateOffer.awaitingNamed').replace(
                    '{{name}}',
                    task.invited_worker_username,
                  )
                : t('dashboard.manage.tasks.privateOffer.awaiting')}
            </span>
          </div>
        ) : null}
      </div>

      {canOpenSupervise ? (
        <footer className="sent-offer-card__footer">
          <button
            type="button"
            className={
              phase === 'funds_released'
                ? 'btn-primary btn-primary--archive'
                : 'btn-primary'
            }
            onClick={openSupervise}
          >
            {phase === 'funds_released' ? (
              <FaFolderOpen className="sent-offer-card__btn-icon" aria-hidden />
            ) : (
              <FaHandshake className="sent-offer-card__btn-icon" aria-hidden />
            )}
            {superviseLabel}
          </button>
        </footer>
      ) : null}
    </article>
  );
};

export default SentPrivateOfferCard;
