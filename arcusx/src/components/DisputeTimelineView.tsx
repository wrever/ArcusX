import React, { useState, useEffect } from 'react';
import { 
  FaTasks, FaCheckCircle, FaWallet, FaCoins, FaFlagCheckered, 
  FaGavel, FaComment, FaFile, FaClock 
} from 'react-icons/fa';
import { getDisputeTimeline, TimelineEvent } from '../services/disputeService';
import '../css/AdminPanel.css';

interface DisputeTimelineViewProps {
  disputeId: number;
}

const DisputeTimelineView: React.FC<DisputeTimelineViewProps> = ({ disputeId }) => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDisputeTimeline(disputeId);
        setTimeline(data.timeline);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el timeline');
      } finally {
        setLoading(false);
      }
    };

    if (disputeId) {
      fetchTimeline();
    }
  }, [disputeId]);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'task_created':
        return <FaTasks style={{ color: '#28c0f0' }} />;
      case 'proposal_accepted':
        return <FaCheckCircle style={{ color: '#10b981' }} />;
      case 'escrow_created':
        return <FaWallet style={{ color: '#28c0f0' }} />;
      case 'escrow_funded':
        return <FaCoins style={{ color: '#10b981' }} />;
      case 'task_completed':
        return <FaFlagCheckered style={{ color: '#f59e0b' }} />;
      case 'dispute_created':
        return <FaGavel style={{ color: '#ef4444' }} />;
      case 'message_sent':
        return <FaComment style={{ color: '#28c0f0' }} />;
      case 'file_uploaded':
        return <FaFile style={{ color: '#28c0f0' }} />;
      default:
        return <FaClock style={{ color: '#28c0f0' }} />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'task_created':
      case 'escrow_created':
      case 'message_sent':
      case 'file_uploaded':
        return '#28c0f0';
      case 'proposal_accepted':
      case 'escrow_funded':
        return '#10b981';
      case 'task_completed':
        return '#f59e0b';
      case 'dispute_created':
        return '#ef4444';
      default:
        return '#28c0f0';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '20px', color: 'rgba(255, 255, 255, 0.6)' }}>
          Cargando timeline...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="admin-alert error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
        <FaClock style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }} />
        <p>No hay eventos en el timeline.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ position: 'relative' }}>
        {/* Línea vertical del timeline */}
        <div style={{
          position: 'absolute',
          left: '25px',
          top: '0',
          bottom: '0',
          width: '2px',
          background: 'linear-gradient(180deg, #28c0f0 0%, #1180b3 100%)',
          opacity: 0.3
        }} />

        {/* Eventos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {timeline.map((event, index) => {
            const eventColor = getEventColor(event.type);
            const isLast = index === timeline.length - 1;

            return (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  gap: '20px',
                  position: 'relative'
                }}
              >
                {/* Icono del evento */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${eventColor}22 0%, ${eventColor}11 100%)`,
                  border: `2px solid ${eventColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0,
                  zIndex: 1,
                  boxShadow: `0 4px 12px ${eventColor}40`
                }}>
                  {getEventIcon(event.type)}
                </div>

                {/* Contenido del evento */}
                <div style={{
                  flex: 1,
                  padding: '15px 20px',
                  background: 'linear-gradient(135deg, rgba(40, 192, 240, 0.1) 0%, rgba(17, 128, 179, 0.1) 100%)',
                  borderRadius: '12px',
                  border: `1px solid ${eventColor}40`,
                  marginBottom: isLast ? '0' : '0'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <h4 style={{
                      margin: 0,
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}>
                      {event.title}
                    </h4>
                    <span style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      whiteSpace: 'nowrap',
                      marginLeft: '15px'
                    }}>
                      {new Date(event.date).toLocaleString('es-ES')}
                    </span>
                  </div>
                  
                  <p style={{
                    margin: '8px 0 0 0',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: '1.6',
                    fontSize: '14px'
                  }}>
                    {event.description}
                  </p>

                  {event.user && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      background: 'rgba(40, 192, 240, 0.1)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      👤 {event.user.username}
                    </div>
                  )}

                  {event.metadata && (
                    <div style={{ marginTop: '10px' }}>
                      {event.metadata.contract_id && (
                        <div style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all'
                        }}>
                          Contract: {event.metadata.contract_id.slice(0, 8)}...{event.metadata.contract_id.slice(-6)}
                        </div>
                      )}
                      {event.metadata.amount && (
                        <div style={{
                          fontSize: '12px',
                          color: '#10b981',
                          fontWeight: 'bold',
                          marginTop: '4px'
                        }}>
                           {event.metadata.amount} USDC
                        </div>
                      )}
                      {event.metadata.reason && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontStyle: 'italic'
                        }}>
                          "{event.metadata.reason}"
                        </div>
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

