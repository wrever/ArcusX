import { useEffect, useState } from 'react';
import { FaIdCard, FaImage } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';

type Props = {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
};

const IdDocumentUploadSlot: React.FC<Props> = ({
  id,
  label,
  hint,
  file,
  onChange,
  required = true,
}) => {
  const { t } = useI18n();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="individual-kyc-id-slot">
      <span className="individual-kyc-id-slot__label">
        {label}
        {required && <span className="individual-kyc-id-slot__required">*</span>}
      </span>
      <label
        htmlFor={id}
        className={`individual-kyc-id-drop${file ? ' has-file' : ''}`}
      >
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            onChange(f);
            e.target.value = '';
          }}
        />
        {preview ? (
          <img src={preview} alt="" className="individual-kyc-id-preview" />
        ) : (
          <FaIdCard className="individual-kyc-id-drop__icon" aria-hidden />
        )}
        <span className="individual-kyc-id-drop__title">
          {file ? t('kyc.individual.id.replace') : t('kyc.individual.id.upload')}
        </span>
        {file ? (
          <span className="individual-kyc-id-filename">{file.name}</span>
        ) : (
          <span className="individual-kyc-id-drop__hint">
            <FaImage style={{ marginRight: 4 }} aria-hidden />
            {hint}
          </span>
        )}
      </label>
    </div>
  );
};

export default IdDocumentUploadSlot;
