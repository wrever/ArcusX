import React, { useState, useEffect } from 'react';
import { FaFile, FaFilePdf, FaFileImage, FaFileArchive, FaDownload, FaEye, FaUser, FaUserTie } from 'react-icons/fa';
import { getDisputeFiles, DisputeFile, DisputeFiles } from '../services/disputeService';
import { publicAssetUrl } from '../config/arcusxApi';
import '../css/AdminPanel.css';
import '../css/dispute-views.css';

interface DisputeFilesViewProps {
  disputeId?: number;
  taskId?: number;
  agreementId?: string;
}

type FileTabType = 'task_files' | 'chat_files' | 'delivery_files';

const TAB_LABELS: Record<FileTabType, string> = {
  task_files: 'Archivos de la Tarea',
  chat_files: 'Archivos del Chat',
  delivery_files: 'Entregas',
};

const DisputeFilesView: React.FC<DisputeFilesViewProps> = ({ disputeId, taskId, agreementId }) => {
  const [files, setFiles] = useState<DisputeFiles>({
    task_files: [],
    chat_files: [],
    delivery_files: [],
  });
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FileTabType>('task_files');
  const [previewFile, setPreviewFile] = useState<DisputeFile | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDisputeFiles(disputeId, taskId, agreementId);
        setFiles(data.files);
        setSummary(data.summary);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los archivos');
      } finally {
        setLoading(false);
      }
    };

    if (disputeId || taskId || agreementId) {
      fetchFiles();
    }
  }, [disputeId, taskId, agreementId]);

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FaFilePdf className="dispute-icon-tone-danger" />;
    if (type.includes('image')) return <FaFileImage className="dispute-icon-tone-success" />;
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
      return <FaFileArchive className="dispute-icon-tone-warning" />;
    }
    return <FaFile className="dispute-icon-tone-accent" />;
  };

  const canPreview = (file: DisputeFile): boolean => file.type.includes('image') || file.type.includes('pdf');

  const getPreviewUrl = (file: DisputeFile): string => {
    if (file.url.startsWith('http')) return file.url;
    return publicAssetUrl(file.url);
  };

  const currentFiles = files[activeTab] || [];
  const tabKeys: FileTabType[] = ['task_files', 'chat_files', 'delivery_files'];

  if (loading) {
    return (
      <div className="dispute-view-center">
        <div className="loading-spinner" />
        <p>Cargando archivos...</p>
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

  return (
    <div className="dispute-view-root">
      <div className="dispute-panel-toolbar">
        <div className="dispute-tab-list">
          {tabKeys.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`dispute-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
              <span className="dispute-tab-count">{files[tab].length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dispute-panel-body">
        {currentFiles.length === 0 ? (
          <div className="dispute-view-center">
            <FaFile style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }} />
            <p>No hay archivos en esta categoría.</p>
          </div>
        ) : (
          <div className="dispute-file-grid">
            {currentFiles.map((file) => (
              <div key={file.id} className="dispute-file-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '24px' }}>{getFileIcon(file.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dispute-file-card-name">{file.filename}</div>
                    <div className="dispute-file-card-meta">
                      {file.size_formatted || `${(file.size / 1024).toFixed(2)} KB`}
                    </div>
                  </div>
                </div>

                <div className="dispute-file-card-meta">
                  {file.uploaded_by === 'client' ? (
                    <>
                      <FaUser style={{ marginRight: '4px' }} /> Cliente
                    </>
                  ) : (
                    <>
                      <FaUserTie style={{ marginRight: '4px' }} /> Trabajador
                    </>
                  )}
                  {file.uploaded_at && (
                    <span style={{ marginLeft: '8px' }}>
                      • {new Date(file.uploaded_at).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>

                <div className="dispute-file-card-actions">
                  {canPreview(file) && (
                    <button
                      type="button"
                      className="dispute-file-btn dispute-file-btn--preview"
                      onClick={() => setPreviewFile(file)}
                    >
                      <FaEye />
                      Ver
                    </button>
                  )}
                  <a
                    href={getPreviewUrl(file)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="dispute-file-btn dispute-file-btn--download"
                  >
                    <FaDownload />
                    Descargar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {summary && (
        <div className="dispute-chat-stats">
          <div className="dispute-chat-stat">
            <div className="dispute-chat-stat-value">{summary.total_files}</div>
            <div className="dispute-chat-stat-label">Total archivos</div>
          </div>
          <div className="dispute-chat-stat">
            <div className="dispute-chat-stat-value">{summary.task_files_count}</div>
            <div className="dispute-chat-stat-label">De la tarea</div>
          </div>
          <div className="dispute-chat-stat">
            <div className="dispute-chat-stat-value">{summary.chat_files_count}</div>
            <div className="dispute-chat-stat-label">Del chat</div>
          </div>
          <div className="dispute-chat-stat">
            <div className="dispute-chat-stat-value">{summary.delivery_files_count}</div>
            <div className="dispute-chat-stat-label">Entregas</div>
          </div>
        </div>
      )}

      {previewFile && (
        <div className="dispute-preview-overlay" onClick={() => setPreviewFile(null)} role="presentation">
          <div className="dispute-preview-panel" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="dispute-preview-header">
              <h3 className="dispute-preview-title">{previewFile.filename}</h3>
              <button type="button" className="dispute-preview-close" onClick={() => setPreviewFile(null)}>
                Cerrar
              </button>
            </div>
            {previewFile.type.includes('image') ? (
              <img
                src={getPreviewUrl(previewFile)}
                alt={previewFile.filename}
                loading="lazy"
                decoding="async"
                className="dispute-preview-media"
              />
            ) : previewFile.type.includes('pdf') ? (
              <iframe
                src={getPreviewUrl(previewFile)}
                className="dispute-preview-iframe"
                title={previewFile.filename}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeFilesView;
