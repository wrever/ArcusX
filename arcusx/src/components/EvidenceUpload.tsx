import React, { useState, useRef } from 'react';
import { FaUpload, FaFile, FaImage, FaVideo, FaFilePdf, FaTrash, FaSpinner, FaLink, FaPaperclip } from 'react-icons/fa';
import '../css/EvidenceUpload.css';
import { useI18n } from '../i18n/I18nProvider';

export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

interface EvidenceUploadProps {
  milestoneId: string;
  onEvidenceSubmit: (milestoneId: string, evidence: string, files: EvidenceFile[]) => void;
  loading?: boolean;
  existingEvidence?: string;
  existingFiles?: EvidenceFile[];
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  milestoneId,
  onEvidenceSubmit,
  loading = false,
  existingEvidence = '',
  existingFiles = []
}) => {
  const { t } = useI18n();
  const [evidence, setEvidence] = useState(existingEvidence);
  const [files, setFiles] = useState<EvidenceFile[]>(existingFiles);
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

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FaImage className="file-icon image" />;
    if (type.startsWith('video/')) return <FaVideo className="file-icon video" />;
    if (type === 'application/pdf') return <FaFilePdf className="file-icon pdf" />;
    return <FaFile className="file-icon default" />;
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
      const formData = new FormData();
      formData.append('milestone_id', milestoneId.toString());
      
      fileList.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error(t('evidence.error.auth'));
      }

      const response = await fetch('/api/auth/upload_milestone_evidence.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setFiles(prev => [...prev, ...result.files]);
      } else {
        setError(result.message || t('evidence.error.upload'));
      }
    } catch (err: any) {
      setError(t('evidence.error.upload') + ': ' + (err.message || 'Error desconocido'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleSubmit = () => {
    if (evidence.trim() || files.length > 0) {
      onEvidenceSubmit(milestoneId, evidence.trim(), files);
    }
  };

  return (
    <div className="evidence-upload">
      <div className="evidence-header">
        <h4 className="evidence-title"><FaPaperclip aria-hidden="true" /> {t('evidence.title')}</h4>
        <div className="evidence-actions">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.zip,.rar"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="upload-btn"
          >
            {uploading ? <FaSpinner className="spinner" /> : <FaUpload />}
            {uploading ? t('evidence.uploading') : t('evidence.upload')}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Evidence Description */}
      <div className="evidence-description">
        <label htmlFor="evidence-text">{t('evidence.description.label')}</label>
        <textarea
          id="evidence-text"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder={t('evidence.description.placeholder')}
          rows={4}
        />
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="evidence-files">
          <h5>{t('evidence.files.attached')}</h5>
          <div className="files-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-info">
                  {getFileIcon(file.type)}
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    onClick={() => window.open(file.url, '_blank')}
                    className="view-btn"
                    title={t('evidence.view.file')}
                  >
                    <FaLink />
                  </button>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="remove-btn"
                    title={t('evidence.remove.file')}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="evidence-submit">
        <button
          onClick={handleSubmit}
          disabled={(!evidence.trim() && files.length === 0) || loading}
          className="btn-primary"
        >
          {loading ? t('evidence.submitting') : t('evidence.submit')}
        </button>
      </div>
    </div>
  );
};

export default EvidenceUpload;
