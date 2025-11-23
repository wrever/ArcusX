import React, { useState, useRef } from 'react';
import { FaUpload, FaDownload, FaFile, FaTrash, FaSpinner } from 'react-icons/fa';
import '../css/FileExchange.css';

interface FileItem {
  id: string;
  name: string;
  filename: string;
  size: number;
  type: string;
  uploaded_at: string;
  uploaded_by: string;
  url: string;
}

interface FileExchangeProps {
  taskId: string;
  currentUserId: string;
  isClient: boolean;
  files: FileItem[];
  onFilesChange: (files: FileItem[]) => void;
}

const FileExchange: React.FC<FileExchangeProps> = ({
  taskId,
  currentUserId,
  isClient,
  files,
  onFilesChange
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      uploadFiles(Array.from(selectedFiles));
    }
  };

  const uploadFiles = async (fileList: File[]) => {
    setUploading(true);
    setError(null);

    try {
      for (const file of fileList) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`https://arcusx.one/api/auth/get_task_details.php?task_id=${taskId}`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Agregar el nuevo archivo a la lista
            onFilesChange([...files, result.file]);
            setError(null);
          } else {
            setError(result.message || 'Error al subir archivo');
          }
        } else {
          setError('Error al subir archivo');
        }
      }
    } catch (err: any) {
      setError('Error al subir archivos: ' + (err.message || 'Error desconocido'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadFile = async (file: FileItem) => {
    try {
      // Crear un elemento <a> temporal para descargar el archivo
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name; // Nombre del archivo para descargar
      link.target = '_blank';
      
      // Agregar al DOM temporalmente, hacer click y remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError('Error al descargar archivo: ' + (err.message || 'Error desconocido'));
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
      return;
    }

    try {
      const response = await fetch(`https://arcusx.one/api/auth/get_task_details.php?task_id=${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_id: fileId })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Eliminar el archivo de la lista
          onFilesChange(files.filter(file => file.id !== fileId));
          setError(null);
        } else {
          setError(result.message || 'Error al eliminar archivo');
        }
      } else {
        setError('Error al eliminar archivo');
      }
    } catch (err: any) {
      setError('Error al eliminar archivo: ' + (err.message || 'Error desconocido'));
    }
  };

  // Los archivos vienen como props, no necesitamos cargarlos
  // React.useEffect(() => {
  //   fetchFiles();
  // }, [taskId]);

  return (
    <div className="file-exchange">
      <div className="file-exchange-header">
        <h2>Intercambio de Archivos</h2>
        <div className="file-actions">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="upload-btn"
          >
            {uploading ? <FaSpinner className="spinner" /> : <FaUpload />}
            {uploading ? 'Subiendo...' : 'Subir Archivos'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="files-container">
        {false ? (
          <div className="loading-files">
            <FaSpinner className="spinner" />
            <p>Cargando archivos...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="no-files">
            <FaFile className="no-files-icon" />
            <p>Aún no existen archivos compartidos.</p>
            <p className="file-info">Sube archivos para compartir con el equipo.</p>
          </div>
        ) : (
          <div className="files-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-info">
                  <FaFile className="file-icon" />
                  <div className="file-details">
                    <h4 className="file-name">{file.name}</h4>
                    <p className="file-meta">
                      {formatFileSize(file.size)} • {file.type} • 
                      Subido por {file.uploaded_by} • 
                      {new Date(file.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    onClick={() => downloadFile(file)}
                    className="download-btn"
                    title="Descargar archivo"
                  >
                    <FaDownload />
                  </button>
                  {(isClient || file.uploaded_by === currentUserId) && (
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="delete-btn"
                      title="Eliminar archivo"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExchange;
