import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaLock, FaShieldAlt } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import VerifiedEnterpriseBadge from './VerifiedEnterpriseBadge';
import IdDocumentUploadSlot from './IdDocumentUploadSlot';
import { KYC_BADGE_ASSETS } from '../config/arcusxBadges';
import {
  getVerificationStatus,
  submitIndividualKyc,
  type KycStatus,
  type VerificationStatusResponse,
} from '../services/kycService';
import {
  formatRutDisplay,
  formatRutOnInput,
  rutValidationMessage,
  validateRut,
} from '../utils/rutChile';
import '../css/EnterpriseKycPanel.css';
import '../css/IndividualKycPanel.css';

type Props = {
  embedded?: boolean;
  onSubmitted?: () => void;
};

const IndividualKycPanel: React.FC<Props> = ({ embedded = false, onSubmitted }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationStatusResponse | null>(null);

  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [country, setCountry] = useState('CL');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);

  const isChile = country === 'CL';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVerificationStatus();
      setStatus(data);
      const p = data.individual_profile;
      if (p) {
        setFullName(p.full_name ?? '');
        setDocumentId(p.document_id ? formatRutDisplay(p.document_id) : '');
        setCountry(p.country ?? 'CL');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('kyc.error.load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const kycStatus = (status?.kyc_status ?? 'not_required') as KycStatus;
  const canSubmit =
    kycStatus !== 'approved' &&
    kycStatus !== 'under_review' &&
    kycStatus !== 'pending';

  const rutError = useMemo(() => {
    if (!isChile || documentId.trim().length < 2) return null;
    return rutValidationMessage(
      documentId,
      t('kyc.individual.rut.invalid'),
      t('kyc.individual.rut.format'),
    );
  }, [documentId, isChile, t]);

  const formComplete = useMemo(() => {
    if (fullName.trim().length < 2) return false;
    if (isChile && (!validateRut(documentId) || rutError)) return false;
    if (!isChile && documentId.trim().length < 3) return false;
    if (!idFront || !idBack) return false;
    if (!consent) return false;
    return true;
  }, [fullName, documentId, isChile, rutError, idFront, idBack, consent]);

  const handleRutChange = (value: string) => {
    if (isChile) {
      setDocumentId(formatRutOnInput(value));
    } else {
      setDocumentId(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComplete) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const rutNormalized = isChile ? formatRutDisplay(documentId) : documentId.trim();
      const res = await submitIndividualKyc({
        full_name: fullName.trim(),
        document_id: rutNormalized,
        country,
        document_front: idFront!,
        document_back: idBack!,
      });
      setSuccess(res.message || t('kyc.individual.submit.success'));
      setIdFront(null);
      setIdBack(null);
      setConsent(false);
      await load();
      onSubmitted?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('kyc.error.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusBlock = () => {
    if (kycStatus === 'approved') {
      return (
        <div className="enterprise-kyc-status is-approved">
          <FaCheckCircle /> {t('kyc.individual.status.approved')}
          <VerifiedEnterpriseBadge verified size="md" />
        </div>
      );
    }
    if (kycStatus === 'under_review' || kycStatus === 'pending') {
      return (
        <div className="enterprise-kyc-status is-review">
          <FaClock /> {t('kyc.status.review')}
        </div>
      );
    }
    if (kycStatus === 'rejected') {
      return (
        <div className="enterprise-kyc-status is-rejected">
          <FaExclamationTriangle /> {t('kyc.status.rejected')}
          {status?.kyc_rejection_reason && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{status.kyc_rejection_reason}</p>
          )}
        </div>
      );
    }
    return (
      <div className="enterprise-kyc-status">
        <FaShieldAlt /> {t('kyc.individual.status.notStarted')}
      </div>
    );
  };

  if (loading) {
    return embedded ? null : (
      <div className="enterprise-kyc-panel individual-kyc-panel">
        <p>{t('kyc.loading')}</p>
      </div>
    );
  }

  if (embedded && (kycStatus === 'under_review' || kycStatus === 'pending')) {
    return null;
  }

  if (embedded && !canSubmit) {
    return null;
  }

  return (
    <div
      className={`enterprise-kyc-panel individual-kyc-panel${embedded ? ' individual-kyc-panel--embedded enterprise-kyc-panel--embedded' : ''}`}
    >
      {!embedded && (
        <>
          <div className="enterprise-kyc-panel__hero">
            <img src={KYC_BADGE_ASSETS.enterpriseVerified} alt="" className="enterprise-kyc-panel__hero-badge" />
            <div>
              <h2>{t('kyc.individual.panel.title')}</h2>
              <p className="text-muted" style={{ marginBottom: 0 }}>
                {t('kyc.individual.panel.subtitle')}
              </p>
            </div>
          </div>
          {statusBlock()}
        </>
      )}

      {canSubmit && (
        <>
          <div className="individual-kyc-steps" aria-hidden>
            <span className="individual-kyc-step is-active">{t('kyc.individual.step.data')}</span>
            <span className="individual-kyc-step is-active">{t('kyc.individual.step.document')}</span>
          </div>

          <div className="individual-kyc-callout">
            <FaLock aria-hidden />
            <p>{t('kyc.individual.privacy')}</p>
          </div>
        </>
      )}

      {error && <p className="enterprise-kyc-error">{error}</p>}
      {success && <p className="enterprise-kyc-success">{success}</p>}

      {canSubmit && (
        <form className="enterprise-kyc-form" onSubmit={handleSubmit}>
          <label>
            {t('kyc.individual.form.fullName')} *
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
              placeholder={t('kyc.individual.form.fullName.placeholder')}
            />
          </label>

          <div className="form-row-2">
            <label className={isChile ? 'individual-kyc-rut-wrap' : undefined}>
              {isChile ? t('kyc.individual.form.rut') : t('kyc.individual.form.documentId')} *
              <input
                value={documentId}
                onChange={(e) => handleRutChange(e.target.value)}
                required
                placeholder={isChile ? '21873093-2' : t('kyc.individual.form.documentId.placeholder')}
                inputMode={isChile ? 'text' : 'text'}
                maxLength={isChile ? 10 : 64}
                aria-invalid={Boolean(rutError)}
              />
              {isChile && (
                <span className="individual-kyc-field-hint">{t('kyc.individual.form.rut.hint')}</span>
              )}
              {rutError && <span className="individual-kyc-field-error">{rutError}</span>}
            </label>
            <label>
              {t('kyc.form.country')}
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  if (e.target.value !== 'CL') setDocumentId('');
                }}
              >
                <option value="CL">Chile</option>
                <option value="AR">Argentina</option>
                <option value="MX">México</option>
                <option value="CO">Colombia</option>
                <option value="PE">Perú</option>
                <option value="US">Estados Unidos</option>
                <option value="OTHER">{t('kyc.form.country.other')}</option>
              </select>
            </label>
          </div>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {t('kyc.individual.form.idCard.title')}
            </legend>
            <p className="individual-kyc-field-hint" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              {t('kyc.individual.form.idCard.lead')}
            </p>
            <div className="individual-kyc-id-grid">
              <IdDocumentUploadSlot
                id="kyc-id-front"
                label={t('kyc.individual.form.idFront')}
                hint={t('kyc.individual.form.idFront.hint')}
                file={idFront}
                onChange={setIdFront}
              />
              <IdDocumentUploadSlot
                id="kyc-id-back"
                label={t('kyc.individual.form.idBack')}
                hint={t('kyc.individual.form.idBack.hint')}
                file={idBack}
                onChange={setIdBack}
              />
            </div>
          </fieldset>

          <label className="individual-kyc-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            <span>{t('kyc.individual.consent')}</span>
          </label>

          <div className="individual-kyc-submit-row">
            <button
              type="submit"
              className="btn-primary enterprise-kyc-submit"
              disabled={submitting || !formComplete}
            >
              {submitting ? t('kyc.form.submitting') : t('kyc.individual.form.submit')}
            </button>
            <span className="individual-kyc-submit-note">{t('kyc.individual.form.submit.note')}</span>
          </div>
        </form>
      )}
    </div>
  );
};

export default IndividualKycPanel;
