import React, { useState, useEffect, useMemo } from 'react';
import { FaUser, FaUserTie, FaSearch, FaFile, FaDownload } from 'react-icons/fa';
import { getDisputeChat, ChatMessage, ChatParticipants, ChatStats } from '../services/disputeService';
import { API_URL } from '../config/database';
import '../css/AdminPanel.css';

interface DisputeChatViewProps {
  disputeId: number;
}

const DisputeChatView: React.FC<DisputeChatViewProps> = ({ disputeId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipants>({});
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByUser, setFilterByUser] = useState<'all' | 'client' | 'worker'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    const fetchChat = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDisputeChat(disputeId);
        setMessages(data.messages);
        setParticipants(data.participants);
        setStats(data.stats);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el chat');
      } finally {
        setLoading(false);
      }
    };

    if (disputeId) {
      fetchChat();
    }
  }, [disputeId]);

  // Filtrar mensajes
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg => 
        msg.message.toLowerCase().includes(query) ||
        msg.sender_username.toLowerCase().includes(query)
      );
    }

    // Filtro por usuario
    if (filterByUser !== 'all' && participants.client && participants.worker) {
      const targetId = filterByUser === 'client' 
        ? participants.client.id 
        : participants.worker.id;
      filtered = filtered.filter(msg => msg.sender_id === targetId);
    }

    // Filtro por fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(msg => {
        const msgDate = new Date(msg.created_at);
        switch (dateFilter) {
          case 'today':
            return msgDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return msgDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return msgDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [messages, searchQuery, filterByUser, dateFilter, participants]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '20px', color: 'rgba(255, 255, 255, 0.6)' }}>
          Cargando chat...
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

  if (messages.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
        <p>No hay mensajes en este chat.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header con participantes */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(40, 192, 240, 0.2)',
        background: 'linear-gradient(135deg, rgba(40, 192, 240, 0.1) 0%, rgba(17, 128, 179, 0.1) 100%)'
      }}>
        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {participants.client && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(90deg, #28c0f0, #1180b3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '18px'
              }}>
                <FaUser />
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#fff' }}>Cliente</div>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {participants.client.username}
                </div>
              </div>
            </div>
          )}
          {participants.worker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(90deg, #1180b3, #28c0f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '18px'
              }}>
                <FaUserTie />
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#fff' }}>Trabajador</div>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {participants.worker.username}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div style={{
        padding: '15px 20px',
        borderBottom: '1px solid rgba(40, 192, 240, 0.2)',
        background: 'rgba(20, 30, 48, 0.5)'
      }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <FaSearch style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.5)'
            }} />
            <input
              type="text"
              placeholder="Buscar mensajes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 40px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(40, 192, 240, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>
          
          <select
            value={filterByUser}
            onChange={(e) => setFilterByUser(e.target.value as 'all' | 'client' | 'worker')}
            style={{
              padding: '10px 15px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(40, 192, 240, 0.3)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="all">Todos los usuarios</option>
            <option value="client">Solo cliente</option>
            <option value="worker">Solo trabajador</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
            style={{
              padding: '10px 15px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(40, 192, 240, 0.3)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>
        </div>
      </div>

      {/* Lista de mensajes */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        maxHeight: '500px'
      }}>
        {filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
            <p>No se encontraron mensajes con los filtros aplicados.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredMessages.map((message) => {
              const isClient = participants.client && message.sender_id === participants.client.id;
              
              return (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    padding: '15px',
                    background: isClient 
                      ? 'linear-gradient(135deg, rgba(40, 192, 240, 0.15) 0%, rgba(17, 128, 179, 0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(17, 128, 179, 0.15) 0%, rgba(40, 192, 240, 0.15) 100%)',
                    borderRadius: '12px',
                    border: `1px solid ${isClient ? 'rgba(40, 192, 240, 0.3)' : 'rgba(17, 128, 179, 0.3)'}`,
                    marginLeft: isClient ? '0' : 'auto',
                    marginRight: isClient ? 'auto' : '0',
                    maxWidth: '70%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isClient 
                        ? 'linear-gradient(90deg, #28c0f0, #1180b3)'
                        : 'linear-gradient(90deg, #1180b3, #28c0f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px'
                    }}>
                      {isClient ? <FaUser /> : <FaUserTie />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
                        {message.sender_username}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                        {new Date(message.created_at).toLocaleString('es-ES')}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {message.message}
                  </div>

                  {/* Archivos adjuntos */}
                  {message.files && message.files.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {message.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={`${API_URL}${file.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 12px',
                            background: 'rgba(40, 192, 240, 0.1)',
                            borderRadius: '6px',
                            border: '1px solid rgba(40, 192, 240, 0.2)',
                            color: '#28c0f0',
                            textDecoration: 'none',
                            fontSize: '13px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(40, 192, 240, 0.2)';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(40, 192, 240, 0.1)';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
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

      {/* Estadísticas */}
      {stats && (
        <div style={{
          padding: '15px 20px',
          borderTop: '1px solid rgba(40, 192, 240, 0.2)',
          background: 'rgba(20, 30, 48, 0.5)',
          display: 'flex',
          gap: '30px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28c0f0' }}>
              {stats.total_messages}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Total mensajes
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28c0f0' }}>
              {stats.client_messages}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Cliente
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28c0f0' }}>
              {stats.worker_messages}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Trabajador
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28c0f0' }}>
              {stats.files_shared}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Archivos
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeChatView;

