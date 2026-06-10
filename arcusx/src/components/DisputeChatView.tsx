import React, { useState, useEffect, useMemo } from 'react';
import { FaUser, FaUserTie, FaSearch, FaFile, FaDownload } from 'react-icons/fa';
import { getDisputeChat, ChatMessage, ChatParticipants, ChatStats } from '../services/disputeService';
import { publicAssetUrl } from '../config/arcusxApi';
import '../css/AdminPanel.css';
import '../css/dispute-views.css';

interface DisputeChatViewProps {
  disputeId?: number;
  taskId?: number;
  agreementId?: string;
}

const DisputeChatView: React.FC<DisputeChatViewProps> = ({ disputeId, taskId, agreementId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipants>({});
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterByUser, setFilterByUser] = useState<'all' | 'client' | 'worker'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    const fetchChat = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDisputeChat(disputeId, taskId, agreementId);
        setMessages(data.messages);
        setParticipants(data.participants);
        setStats(data.stats);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el chat');
      } finally {
        setLoading(false);
      }
    };

    if (disputeId || taskId || agreementId) {
      fetchChat();
    }
  }, [disputeId, taskId, agreementId]);

  const filteredMessages = useMemo(() => {
    let filtered = [...messages];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (msg) =>
          msg.message.toLowerCase().includes(query) ||
          msg.sender_username.toLowerCase().includes(query),
      );
    }

    if (filterByUser !== 'all' && participants.client && participants.worker) {
      const targetId = filterByUser === 'client' ? participants.client.id : participants.worker.id;
      filtered = filtered.filter((msg) => msg.sender_id === targetId);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((msg) => {
        const msgDate = new Date(msg.created_at);
        switch (dateFilter) {
          case 'today':
            return msgDate.toDateString() === now.toDateString();
          case 'week': {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return msgDate >= weekAgo;
          }
          case 'month': {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return msgDate >= monthAgo;
          }
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [messages, searchQuery, filterByUser, dateFilter, participants]);

  if (loading) {
    return (
      <div className="dispute-view-center">
        <div className="loading-spinner" />
        <p>Cargando chat...</p>
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

  if (messages.length === 0) {
    return (
      <div className="dispute-view-center">
        <p>No hay mensajes en este chat.</p>
      </div>
    );
  }

  return (
    <div className="dispute-view-root">
      <div className="dispute-chat-header">
        <div className="dispute-chat-participants">
          {participants.client && (
            <div className="dispute-chat-participant">
              <div className="dispute-chat-avatar">
                <FaUser />
              </div>
              <div>
                <div className="dispute-chat-participant-name">Cliente</div>
                <div className="dispute-chat-participant-role">{participants.client.username}</div>
              </div>
            </div>
          )}
          {participants.worker && (
            <div className="dispute-chat-participant">
              <div className="dispute-chat-avatar dispute-chat-avatar--worker">
                <FaUserTie />
              </div>
              <div>
                <div className="dispute-chat-participant-name">Trabajador</div>
                <div className="dispute-chat-participant-role">{participants.worker.username}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dispute-chat-filters">
        <div className="dispute-chat-filters-row">
          <div className="dispute-chat-search-wrap">
            <FaSearch className="dispute-chat-search-icon" />
            <input
              type="text"
              className="dispute-chat-input"
              placeholder="Buscar mensajes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="dispute-chat-select"
            value={filterByUser}
            onChange={(e) => setFilterByUser(e.target.value as 'all' | 'client' | 'worker')}
          >
            <option value="all">Todos los usuarios</option>
            <option value="client">Solo cliente</option>
            <option value="worker">Solo trabajador</option>
          </select>

          <select
            className="dispute-chat-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
          >
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>
        </div>
      </div>

      <div className="dispute-chat-messages">
        {filteredMessages.length === 0 ? (
          <div className="dispute-view-center">
            <p>No se encontraron mensajes con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="dispute-chat-messages-list">
            {filteredMessages.map((message) => {
              const isClient = Boolean(participants.client && message.sender_id === participants.client.id);

              return (
                <div
                  key={message.id}
                  className={`dispute-chat-bubble ${isClient ? 'dispute-chat-bubble--client' : 'dispute-chat-bubble--worker'}`}
                >
                  <div className="dispute-chat-bubble-header">
                    <div className="dispute-chat-bubble-avatar">
                      {isClient ? <FaUser /> : <FaUserTie />}
                    </div>
                    <div>
                      <div className="dispute-chat-bubble-author">{message.sender_username}</div>
                      <div className="dispute-chat-bubble-time">
                        {new Date(message.created_at).toLocaleString('es-ES')}
                      </div>
                    </div>
                  </div>

                  <div className="dispute-chat-bubble-body">{message.message}</div>

                  {message.files && message.files.length > 0 && (
                    <div className="dispute-chat-attachments">
                      {message.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={publicAssetUrl(file.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dispute-chat-attachment"
                        >
                          <FaFile />
                          <span>{file.filename}</span>
                          <FaDownload style={{ marginLeft: 'auto', fontSize: '11px' }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {stats && (
        <div className="dispute-chat-stats">
          <div className="dispute-chat-stat">
            <div className="dispute-chat-stat-value">{stats.total_messages}</div>
            <div className="dispute-chat-stat-label">Total mensajes</div>
          </div>
          <div className="dispute-chat-stat">
            <div className="dispute-chat-stat-value">{stats.client_messages}</div>
            <div className="dispute-chat-stat-label">Cliente</div>
          </div>
          <div className="dispute-chat-stat">
            <div className="dispute-chat-stat-value">{stats.worker_messages}</div>
            <div className="dispute-chat-stat-label">Trabajador</div>
          </div>
          <div className="dispute-chat-stat">
            <div className="dispute-chat-stat-value">{stats.files_shared}</div>
            <div className="dispute-chat-stat-label">Archivos</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeChatView;
