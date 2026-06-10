import React, { useCallback, useEffect, useState } from 'react';
import { FaHistory, FaSync } from 'react-icons/fa';
import { getAdminDomainEvents, type DomainEventRow } from '../services/adminService';
import '../css/AdminPanel.css';

const AdminActivity: React.FC = () => {
  const [events, setEvents] = useState<DomainEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDomainEvents({ page, limit: 40 });
      setEvents(data.events);
      setTotalPages(data.pagination.total_pages || 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar actividad');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>
          <FaHistory /> Actividad operativa
        </h2>
        <button type="button" className="retry-button" onClick={load} disabled={loading}>
          <FaSync /> Actualizar
        </button>
      </div>
      <p className="admin-section-desc">
        Eventos de dominio (escrow, tareas, disputas, evidencia). Fuente:{' '}
        <code>arcusx_domain_events</code>
      </p>

      {error && <p className="admin-error-text">{error}</p>}
      {loading && <p>Cargando...</p>}

      {!loading && events.length === 0 && <p>No hay eventos registrados aún.</p>}

      {!loading && events.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Entidad</th>
                <th>Actor</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{new Date(ev.created_at).toLocaleString()}</td>
                  <td>
                    <code>{ev.event_type}</code>
                  </td>
                  <td>
                    {ev.entity_type} #{ev.entity_id}
                  </td>
                  <td>{ev.actor_user_id ?? '—'}</td>
                  <td className="admin-activity-payload">
                    {ev.payload ? JSON.stringify(ev.payload).slice(0, 120) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminActivity;
