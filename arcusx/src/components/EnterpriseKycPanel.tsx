import React, { useCallback, useEffect, useState } from 'react';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import VerifiedEnterpriseBadge from './VerifiedEnterpriseBadge';
import { KYC_BADGE_ASSETS } from '../config/arcusxBadges';
import {
  getVerificationStatus,
  submitEnterpriseKyc,
  type KycStatus,
  type VerificationStatusResponse,
} from '../services/kycService';
import '../css/EnterpriseKycPanel.css';

type Props = {
  embedded?: boolean;
  onSubmitted?: () => void;
};

const EnterpriseKycPanel: React.FC<Props> = ({ embedded = false, onSubmitted }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationStatusResponse | null>(null);

  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [country, setCountry] = useState('CL');
  const [repName, setRepName] = useState('');
  const [repRole, setRepRole] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVerificationStatus();
      setStatus(data);
      const p = data.enterprise_profile;
      if (p) {
        setLegalName(p.legal_name ?? '');
        setTradeName(p.trade_name ?? '');
        setTaxId(p.tax_id ?? '');
        setCountry(p.country ?? 'CL');
        setRepName(p.representative_name ?? '');
        setRepRole(p.representative_role ?? '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await submitEnterpriseKyc({
        legal_name: legalName,
        trade_name: tradeName,
        tax_id: taxId,
        country,
        representative_name: repName,
        representative_role: repRole,
        website,
        contact_phone: phone,
        documents,
      });
      setSuccess(res.message || t('kyc.submit.success'));
      setDocuments([]);
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
          <FaCheckCircle /> {t('kyc.status.approved')}
          <VerifiedEnterpriseBadge kind="enterprise" verified size="md" />
        </div>
      );
    }
    if (kycStatus === 'under_review' || kycStatus === 'pending') {
      return (
        <div className="enterprise-kyc-status is-review">
          <FaClock /> {t('kyc.status.review')}
          <VerifiedEnterpriseBadge kind="enterprise" pending size="md" />
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
        <FaShieldAlt /> {t('kyc.status.notStarted')}
      </div>
    );
  };

  if (loading) {
    return embedded ? null : (
      <div className="enterprise-kyc-panel">
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
    <div className={`enterprise-kyc-panel${embedded ? ' enterprise-kyc-panel--embedded' : ''}`}>
      {!embedded && (
        <>
          <div className="enterprise-kyc-panel__hero">
            <img
              src={KYC_BADGE_ASSETS.enterpriseVerified}
              alt=""
              className="enterprise-kyc-panel__hero-badge"
            />
            <div>
              <h2>{t('kyc.panel.title')}</h2>
              <p className="text-muted" style={{ marginBottom: 0 }}>{t('kyc.panel.subtitle')}</p>
            </div>
          </div>
          {statusBlock()}
        </>
      )}
      {error && <p className="enterprise-kyc-error">{error}</p>}
      {success && <p className="enterprise-kyc-success">{success}</p>}

      {canSubmit && (
        <form className="enterprise-kyc-form" onSubmit={handleSubmit}>
          <label>
            {t('kyc.form.legalName')} *
            <input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              required
              minLength={2}
              placeholder={t('kyc.form.legalName.placeholder')}
            />
          </label>
          <label>
            {t('kyc.form.tradeName')}
            <input
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              placeholder={t('kyc.form.tradeName.placeholder')}
            />
          </label>
          <div className="form-row-2">
            <label>
              {t('kyc.form.taxId')} *
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                required
                minLength={3}
                placeholder="76.123.456-7"
              />
            </label>
            <label>
              {t('kyc.form.country')}
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
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
          <div className="form-row-2">
            <label>
              {t('kyc.form.repName')}
              <input value={repName} onChange={(e) => setRepName(e.target.value)} />
            </label>
            <label>
              {t('kyc.form.repRole')}
              <input value={repRole} onChange={(e) => setRepRole(e.target.value)} placeholder="CEO / RR.HH." />
            </label>
          </div>
          <div className="form-row-2">
            <label>
              {t('kyc.form.website')}
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
            <label>
              {t('kyc.form.phone')}
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>
          <label>
            {t('kyc.form.documents')}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              multiple
              onChange={(e) => setDocuments(Array.from(e.target.files ?? []).slice(0, 5))}
            />
            <span className="enterprise-kyc-docs-hint">{t('kyc.form.documents.hint')}</span>
          </label>
          <button type="submit" className="btn-primary enterprise-kyc-submit" disabled={submitting}>
            {submitting ? t('kyc.form.submitting') : t('kyc.form.submit')}
          </button>
        </form>
      )}
    </div>
  );
};

export default EnterpriseKycPanel;
