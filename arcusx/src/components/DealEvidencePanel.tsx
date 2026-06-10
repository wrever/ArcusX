import { useCallback, useEffect, useRef, useState } from 'react';
import { FaPaperclip } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { arcusxApiHeaders, arcusxApiUrl } from '../config/arcusxApi';
import { getDealEvidence, type DealEvidenceItem } from '../services/dealsService';
import '../css/EvidenceUpload.css';

type DealEvidencePanelProps = {
  agreementId: string;
  canUpload?: boolean;
};

const DealEvidencePanel = ({ agreementId, canUpload = true }: DealEvidencePanelProps) => {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<DealEvidenceItem[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    getDealEvidence(agreementId)
      .then((r) => setItems(r.evidence ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [agreementId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitEvidence = async () => {
    const files = fileRef.current?.files;
    const trimmed = note.trim();
    if (!trimmed && (!files || files.length === 0)) {
      setError(t('deals.evidence.error.empty'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('agreement_id', agreementId);
      if (trimmed) form.append('note', trimmed);
      if (files) {
        Array.from(files).forEach((file, i) => form.append(`file_${i}`, file));
      }
      const headers = arcusxApiHeaders();
      headers.delete('Content-Type');
      const res = await fetch(arcusxApiUrl('upload_deal_evidence'), {
        method: 'POST',
        headers,
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || t('deals.evidence.error.upload'));
      setNote('');
      if (fileRef.current) fileRef.current.value = '';
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.evidence.error.upload'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="deal-evidence-panel">
      <h3>{t('deals.evidence.title')}</h3>
      <p className="deals-disclaimer">{t('deals.evidence.hint')}</p>

      {loading && <p>{t('deals.loading')}</p>}
      {error && <p className="deals-error" role="alert">{error}</p>}

      {items.length > 0 && (
        <ul className="deal-evidence-list">
          {items.map((item) => (
            <li key={item.id} className="deal-evidence-item">
              {item.note && <p className="deal-evidence-note">{item.note}</p>}
              {Array.isArray(item.files) && item.files.length > 0 && (
                <ul>
                  {item.files.map((f) => (
                    <li key={String(f.id ?? f.name)}>
                      {f.url ? (
                        <a href={String(f.url)} target="_blank" rel="noreferrer">
                          <FaPaperclip /> {String(f.name ?? 'archivo')}
                        </a>
                      ) : (
                        <span>{String(f.name ?? 'archivo')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <time className="deal-evidence-time">{item.created_at}</time>
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <div className="evidence-upload-form">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('deals.evidence.placeholder')}
            rows={3}
          />
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf,text/plain,video/mp4,video/webm"
            disabled={submitting}
          />
          <button type="button" className="deals-btn secondary" disabled={submitting} onClick={() => void submitEvidence()}>
            {submitting ? '…' : t('deals.evidence.submit')}
          </button>
        </div>
      )}
    </section>
  );
};

export default DealEvidencePanel;
