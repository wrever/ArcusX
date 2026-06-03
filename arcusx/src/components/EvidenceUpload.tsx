import React, { useState, useRef } from 'react';
import {
  FaUpload,
  FaFile,
  FaImage,
  FaVideo,
  FaFilePdf,
  FaTrash,
  FaSpinner,
  FaPaperclip,
} from 'react-icons/fa';
import '../css/EvidenceUpload.css';
import { useI18n } from '../i18n/I18nProvider';
import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';

export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

interface EvidenceUploadProps {
  taskId: number;
  milestoneIndex?: number;
  onEvidenceSubmit?: (files: EvidenceFile[], note: string) => void;
  loading?: boolean;
  existingEvidence?: string;
  existingFiles?: EvidenceFile[];
  readOnly?: boolean;
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  taskId,
  milestoneIndex = 0,
  onEvidenceSubmit,
  loading = false,
  existingEvidence = '',
  existingFiles = [],
  readOnly = false,
}) => {
  const { t } = useI18n();
  const [note, setNote] = useState(existingEvidence);
  const [files, setFiles] = useState<EvidenceFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FaImage className="file-icon image" />;
    if (type.startsWith('video/')) return <FaVideo className="file-icon video" />;
    if (type === 'application/pdf') return <FaFilePdf className="file-icon pdf" />;
    return <FaFile className="file-icon default" />;
  };

  const uploadToApi = async (fileList: File[], noteText: string) => {
    const formData = new FormData();
    formData.append('task_id', String(taskId));
    formData.append('milestone_index', String(milestoneIndex));
    if (noteText.trim()) formData.append('note', noteText.trim());
    fileList.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    const headers = arcusxApiHeaders();
    headers.delete('Content-Type');

    const response = await fetch(arcusxApiUrl('upload_milestone_evidence'), {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || t('evidence.error.upload'));
    }
    const saved = data.evidence?.files as EvidenceFile[] | undefined;
    if (saved?.length) {
      setFiles(saved);
    }
    if (data.evidence?.note) setNote(String(data.evidence.note));
    onEvidenceSubmit?.(saved ?? files, noteText);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (!selected?.length || readOnly) return;
    setUploading(true);
    setError(null);
    try {
      await uploadToApi(Array.from(selected), note);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('evidence.error.upload'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmitNote = async () => {
    if (readOnly) return;
    setUploading(true);
    setError(null);
    try {
      await uploadToApi([], note);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('evidence.error.upload'));
    } finally {
      setUploading(false);
    }
  };

  const removeLocalFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const busy = uploading || loading;

  return (
    <div className="evidence-upload">
      <div className="evidence-header">
        <h4>
          <FaPaperclip /> {t('evidence.title')}
        </h4>
        {!readOnly && (
          <div className="evidence-actions">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,video/mp4,video/webm,text/plain"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="upload-btn"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <FaSpinner className="spin" /> : <FaUpload />}
              {uploading ? t('evidence.uploading') : t('evidence.upload')}
            </button>
          </div>
        )}
      </div>

      {error && <p className="evidence-error">{error}</p>}

      <label className="evidence-description-label">{t('evidence.description.label')}</label>
      <textarea
        className="evidence-textarea"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('evidence.description.placeholder')}
        disabled={readOnly || busy}
        rows={4}
      />

      {files.length > 0 && (
        <div className="evidence-files">
          <p className="evidence-files-title">{t('evidence.files.attached')}</p>
          <ul>
            {files.map((file) => (
              <li key={file.id} className="evidence-file-item">
                {getFileIcon(file.type)}
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
                {file.url && (
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    {t('evidence.view.file')}
                  </a>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={() => removeLocalFile(file.id)}
                    title={t('evidence.remove.file')}
                  >
                    <FaTrash />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!readOnly && note.trim() && (
        <button
          type="button"
          className="submit-evidence-btn"
          disabled={busy}
          onClick={handleSubmitNote}
        >
          {busy ? t('evidence.submitting') : t('evidence.submit')}
        </button>
      )}
    </div>
  );
};

export default EvidenceUpload;
