import React, { useState, useEffect } from 'react';
import {
  FaTasks, FaCheckCircle, FaWallet, FaCoins, FaFlagCheckered,
  FaGavel, FaComment, FaFile, FaClock, FaUser,
} from 'react-icons/fa';
import { getDisputeTimeline, TimelineEvent } from '../services/disputeService';
import '../css/AdminPanel.css';
import '../css/dispute-views.css';

interface DisputeTimelineViewProps {
  disputeId?: number;
  taskId?: number;
  agreementId?: string;
}

type EventTone = 'accent' | 'success' | 'warning' | 'danger';

const DisputeTimelineView: React.FC<DisputeTimelineViewProps> = ({ disputeId, taskId, agreementId }) => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDisputeTimeline(disputeId, taskId, agreementId);
        setTimeline(data.timeline);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el timeline');
      } finally {
        setLoading(false);
      }
    };

    if (disputeId || taskId || agreementId) {
      fetchTimeline();
    }
  }, [disputeId, taskId, agreementId]);

  const getEventIcon = (type: TimelineEvent['type']) => {
    const tone = getEventTone(type);
    const cls = `dispute-icon-tone-${tone}`;
    switch (type) {
      case 'task_created':
        return <FaTasks className={cls} />;
      case 'proposal_accepted':
        return <FaCheckCircle className={cls} />;
      case 'escrow_created':
        return <FaWallet className={cls} />;
      case 'escrow_funded':
        return <FaCoins className={cls} />;
      case 'task_completed':
        return <FaFlagCheckered className={cls} />;
      case 'dispute_created':
        return <FaGavel className={cls} />;
      case 'message_sent':
        return <FaComment className={cls} />;
      case 'file_uploaded':
        return <FaFile className={cls} />;
      default:
        return <FaClock className={cls} />;
    }
  };

  const getEventTone = (type: TimelineEvent['type']): EventTone => {
    switch (type) {
      case 'proposal_accepted':
      case 'escrow_funded':
        return 'success';
      case 'task_completed':
        return 'warning';
      case 'dispute_created':
        return 'danger';
      default:
        return 'accent';
    }
  };

  if (loading) {
    return (
      <div className="dispute-view-center">
        <div className="loading-spinner" />
        <p>Cargando timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dispute-view-center">
        <div className="admin-alert error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="dispute-view-center">
        <FaClock style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }} />
        <p>No hay eventos en el timeline.</p>
      </div>
    );
  }

  return (
    <div className="dispute-timeline-wrap">
      <div className="dispute-timeline-track">
        <div className="dispute-timeline-line" aria-hidden />
        <div className="dispute-timeline-events">
          {timeline.map((event) => {
            const tone = getEventTone(event.type);
            return (
              <div key={event.id} className="dispute-timeline-event">
                <div className={`dispute-timeline-icon tone-${tone}`}>
                  {getEventIcon(event.type)}
                </div>
                <div className="dispute-timeline-body">
                  <div className="dispute-timeline-body-head">
                    <h4 className="dispute-timeline-body-title">{event.title}</h4>
                    <span className="dispute-timeline-body-date">
                      {new Date(event.date).toLocaleString('es-ES')}
                    </span>
                  </div>
                  <p className="dispute-timeline-body-desc">{event.description}</p>
                  {event.user && (
                    <div className="dispute-timeline-user-chip">
                      <FaUser /> {event.user.username}
                    </div>
                  )}
                  {event.metadata && (
                    <div>
                      {event.metadata.contract_id && (
                        <div className="dispute-muted-text" style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          Contract: {event.metadata.contract_id.slice(0, 8)}...{event.metadata.contract_id.slice(-6)}
                        </div>
                      )}
                      {event.metadata.amount && (
                        <div className="dispute-timeline-meta-amount">{event.metadata.amount} USDC</div>
                      )}
                      {event.metadata.reason && (
                        <div className="dispute-timeline-reason">&ldquo;{event.metadata.reason}&rdquo;</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DisputeTimelineView;
