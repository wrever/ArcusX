import React, { useState, useEffect } from 'react';
import { FaFile, FaFilePdf, FaFileImage, FaFileArchive, FaDownload, FaEye } from 'react-icons/fa';
import { getDisputeFiles, DisputeFile, DisputeFiles } from '../services/disputeService';
import { API_URL } from '../config/database';
import '../css/AdminPanel.css';

interface DisputeFilesViewProps {
  disputeId: number;
}

type FileTabType = 'task_files' | 'chat_files' | 'delivery_files';

const DisputeFilesView: React.FC<DisputeFilesViewProps> = ({ disputeId }) => {
  const [files, setFiles] = useState<DisputeFiles>({
    task_files: [],
    chat_files: [],
    delivery_files: []
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
        const data = await getDisputeFiles(disputeId);
        setFiles(data.files);
        setSummary(data.summary);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los archivos');
        console.error('Error al cargar archivos:', err);
      } finally {
        setLoading(false);
      }
    };

    if (disputeId) {
      fetchFiles();
    }
  }, [disputeId]);

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FaFilePdf style={{ color: '#ef4444' }} />;
    if (type.includes('image')) return <FaFileImage style={{ color: '#10b981' }} />;
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
      return <FaFileArchive style={{ color: '#f59e0b' }} />;
    }
    return <FaFile style={{ color: '#28c0f0' }} />;
  };

  const canPreview = (file: DisputeFile): boolean => {
    return file.type.includes('image') || file.type.includes('pdf');
  };

  const getPreviewUrl = (file: DisputeFile): string => {
    if (file.url.startsWith('http')) {
      return file.url;
    }
    return `${API_URL}${file.url}`;
  };

  const currentFiles = files[activeTab] || [];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '20px', color: 'rgba(255, 255, 255, 0.6)' }}>
          Cargando archivos...
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '20px',
        borderBottom: '1px solid rgba(40, 192, 240, 0.2)',
        background: 'rgba(20, 30, 48, 0.5)'
      }}>
        <button
          onClick={() => setActiveTab('task_files')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'task_files' 
              ? 'linear-gradient(90deg, #28c0f0, #1180b3)'
              : 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${activeTab === 'task_files' ? 'transparent' : 'rgba(40, 192, 240, 0.3)'}`,
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            if (activeTab !== 'task_files') {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseOut={(e) => {
            if (activeTab !== 'task_files') {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }
          }}
        >
          Archivos de la Tarea
          <span style={{
            marginLeft: '8px',
            padding: '2px 8px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            fontSize: '12px'
          }}>
            {files.task_files.length}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('chat_files')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'chat_files' 
              ? 'linear-gradient(90deg, #28c0f0, #1180b3)'
              : 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${activeTab === 'chat_files' ? 'transparent' : 'rgba(40, 192, 240, 0.3)'}`,
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            if (activeTab !== 'chat_files') {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseOut={(e) => {
            if (activeTab !== 'chat_files') {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }
          }}
        >
          Archivos del Chat
          <span style={{
            marginLeft: '8px',
            padding: '2px 8px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            fontSize: '12px'
          }}>
            {files.chat_files.length}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('delivery_files')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'delivery_files' 
              ? 'linear-gradient(90deg, #28c0f0, #1180b3)'
              : 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${activeTab === 'delivery_files' ? 'transparent' : 'rgba(40, 192, 240, 0.3)'}`,
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            if (activeTab !== 'delivery_files') {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseOut={(e) => {
            if (activeTab !== 'delivery_files') {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }
          }}
        >
          Entregas
          <span style={{
            marginLeft: '8px',
            padding: '2px 8px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            fontSize: '12px'
          }}>
            {files.delivery_files.length}
          </span>
        </button>
      </div>

      {/* Grid de archivos */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        maxHeight: '500px'
      }}>
        {currentFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
            <FaFile style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }} />
            <p>No hay archivos en esta categoría.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            {currentFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  padding: '15px',
                  background: 'linear-gradient(135deg, rgba(40, 192, 240, 0.1) 0%, rgba(17, 128, 179, 0.1) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(40, 192, 240, 0.2)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(40, 192, 240, 0.2) 0%, rgba(17, 128, 179, 0.2) 100%)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(40, 192, 240, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(40, 192, 240, 0.1) 0%, rgba(17, 128, 179, 0.1) 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '24px' }}>
                    {getFileIcon(file.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 'bold',
                      color: '#fff',
                      fontSize: '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.filename}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                      {file.size_formatted || `${(file.size / 1024).toFixed(2)} KB`}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '10px' }}>
                  {file.uploaded_by === 'client' ? '👤 Cliente' : '👷 Trabajador'}
                  {file.uploaded_at && (
                    <span style={{ marginLeft: '8px' }}>
                      • {new Date(file.uploaded_at).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {canPreview(file) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'rgba(40, 192, 240, 0.2)',
                        border: '1px solid rgba(40, 192, 240, 0.3)',
                        borderRadius: '6px',
                        color: '#28c0f0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(40, 192, 240, 0.3)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(40, 192, 240, 0.2)';
                      }}
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
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'linear-gradient(90deg, #28c0f0, #1180b3)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #1180b3, #28c0f0)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #28c0f0, #1180b3)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
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

      {/* Resumen */}
      {summary && (
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
              {summary.total_files}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Total archivos
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28c0f0' }}>
              {summary.task_files_count}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              De la tarea
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28c0f0' }}>
              {summary.chat_files_count}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Del chat
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28c0f0' }}>
              {summary.delivery_files_count}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Entregas
            </div>
          </div>
        </div>
      )}

      {/* Modal de preview */}
      {previewFile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '20px'
          }}
          onClick={() => setPreviewFile(null)}
        >
          <div
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              background: 'rgba(20, 30, 48, 0.95)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(40, 192, 240, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#fff', margin: 0 }}>{previewFile.filename}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cerrar
              </button>
            </div>
            {previewFile.type.includes('image') ? (
              <img
                src={getPreviewUrl(previewFile)}
                alt={previewFile.filename}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  borderRadius: '8px'
                }}
              />
            ) : previewFile.type.includes('pdf') ? (
              <iframe
                src={getPreviewUrl(previewFile)}
                style={{
                  width: '800px',
                  height: '600px',
                  border: 'none',
                  borderRadius: '8px'
                }}
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

