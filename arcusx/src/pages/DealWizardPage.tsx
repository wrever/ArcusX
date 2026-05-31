import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCopy, FaHandshake } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { useWallet } from '../hooks/useWallet';
import { usePlatformFee } from '../hooks/usePlatformFee';
import { DEAL_TEMPLATES, getDealTemplate, type DealTemplateId } from '../constants/dealTemplates';
import { createDeal, dealPublicUrl } from '../services/dealsService';
import '../css/DealsPages.css';

const STEPS = ['template', 'info', 'payment', 'review'] as const;

const DealWizardPage = () => {
  const { t } = useI18n();
  const { address, isConnected, connectWallet } = useWallet();
  const { platformFee, loading: feeLoading } = usePlatformFee();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState<DealTemplateId>('peer_car_sale');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [iReceivePayment, setIReceivePayment] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdLink, setCreatedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const tpl = useMemo(() => getDealTemplate(templateId), [templateId]);

  useEffect(() => {
    setTitle(t(tpl.titleKey));
    setDescription(t(tpl.descriptionKey));
    setIReceivePayment(tpl.defaultFunderRole === 'counterparty');
  }, [templateId, t, tpl.titleKey, tpl.descriptionKey, tpl.defaultFunderRole]);

  const netAmount = parseFloat(amount) || 0;
  const clientTotal = netAmount > 0 ? netAmount / (1 - platformFee) : 0;
  const feeAmount = clientTotal - netAmount;

  const handleCreate = async () => {
    setError('');
    if (!isConnected || !address) {
      setError(t('deals.error.wallet'));
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t('deals.error.amount'));
      return;
    }
    setLoading(true);
    try {
      const beneficiary = address;
      const releaseSigner = address;
      const funderRole = iReceivePayment ? 'counterparty' : 'initiator';

      const res = await createDeal({
        template_id: templateId,
        title: title.trim(),
        description: description.trim(),
        amount_usdc: amt,
        initiator_wallet: address,
        release_signer_wallet: releaseSigner,
        beneficiary_wallet: beneficiary,
        funder_role: funderRole,
      });
      const token = res.deal_token as string;
      setCreatedLink(dealPublicUrl(token));
      setStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (createdLink) {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdLink) {
    return (
      <div className="deals-page">
        <h1><FaHandshake /> {t('deals.wizard.doneTitle')}</h1>
        <p className="deals-lead">{t('deals.wizard.doneLead')}</p>
        <div className="deals-form-card">
          <div className="deals-link-box">
            <input type="text" readOnly value={createdLink} aria-label="Payment link" />
            <button type="button" className="deals-btn primary" onClick={() => void copyLink()}>
              <FaCopy /> {copied ? t('deals.wizard.copied') : t('deals.wizard.copyLink')}
            </button>
          </div>
          <div className="deals-actions">
            <Link to="/dashboard?tab=deals" className="deals-btn secondary">{t('deals.wizard.goDashboard')}</Link>
          </div>
        </div>
        <p className="deals-disclaimer">{t('deals.disclaimer')}</p>
      </div>
    );
  }

  return (
    <div className="deals-page">
      <Link to="/dashboard?tab=deals" className="deals-btn secondary" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
        <FaArrowLeft /> {t('deals.back')}
      </Link>
      <h1>{t('deals.wizard.title')}</h1>
      <p className="deals-lead">{t('deals.wizard.lead')}</p>

      <div className="deals-steps">
        {STEPS.map((s, i) => (
          <span key={s} className={`deals-step-pill ${step === i ? 'is-active' : ''}`}>
            {t(`deals.wizard.step.${s}`)}
          </span>
        ))}
      </div>

      {error && <p className="deals-error" role="alert">{error}</p>}

      <div className="deals-form-card">
        {step === 0 && (
          <>
            <label>{t('deals.wizard.pickTemplate')}</label>
            <div className="deals-template-grid">
              {DEAL_TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`deals-template-btn ${templateId === item.id ? 'is-selected' : ''}`}
                  onClick={() => setTemplateId(item.id)}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
            <p className="deals-disclaimer">{t(tpl.descriptionKey)}</p>
            <div className="deals-actions">
              <button type="button" className="deals-btn primary" onClick={() => setStep(1)}>{t('deals.wizard.next')}</button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="deals-disclaimer">{t('deals.wizard.prefillHint')}</p>
            <label htmlFor="deal-title">{t('deals.wizard.titleLabel')}</label>
            <input
              id="deal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(tpl.titlePlaceholderKey)}
            />
            <label htmlFor="deal-desc">{t('deals.wizard.descLabel')}</label>
            <textarea
              id="deal-desc"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(tpl.descriptionPlaceholderKey)}
            />
            <div className="deals-actions">
              <button type="button" className="deals-btn secondary" onClick={() => setStep(0)}>{t('deals.wizard.back')}</button>
              <button type="button" className="deals-btn primary" onClick={() => setStep(2)} disabled={title.trim().length < 3}>{t('deals.wizard.next')}</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <label htmlFor="deal-amount">{t('deals.wizard.amountLabel')}</label>
            <input
              id="deal-amount"
              type="number"
              min="0"
              step="0.0000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t(tpl.amountPlaceholderKey)}
            />
            <label className="deals-checkbox-label">
              <input
                type="checkbox"
                checked={iReceivePayment}
                onChange={(e) => setIReceivePayment(e.target.checked)}
              />
              {t('deals.wizard.iReceive')}
            </label>
            {!isConnected ? (
              <button type="button" className="deals-btn primary" onClick={() => void connectWallet()}>
                {t('deals.wizard.connectWallet')}
              </button>
            ) : (
              <p className="deals-disclaimer">{t('deals.wizard.walletConnected')}: <code>{address?.slice(0, 8)}…</code></p>
            )}
            <div className="deals-actions">
              <button type="button" className="deals-btn secondary" onClick={() => setStep(1)}>{t('deals.wizard.back')}</button>
              <button type="button" className="deals-btn primary" onClick={() => setStep(3)} disabled={!isConnected || netAmount <= 0}>{t('deals.wizard.next')}</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="deals-summary-row"><span>{t('deals.wizard.protected')}</span><strong>{netAmount.toFixed(2)} USDC</strong></div>
            <div className="deals-summary-row">
              <span>{t('deals.wizard.fee')}</span>
              <strong>
                {feeLoading ? '…' : `${(platformFee * 100).toFixed(1)}%`} ({feeAmount.toFixed(2)} USDC)
              </strong>
            </div>
            <div className="deals-summary-row"><span>{t('deals.wizard.totalDeposit')}</span><strong>{clientTotal.toFixed(2)} USDC</strong></div>
            <p className="deals-disclaimer">{t('deals.wizard.payerNote')}</p>
            <p className="deals-disclaimer">{t('deals.wizard.feeLocked')}</p>
            <div className="deals-actions">
              <button type="button" className="deals-btn secondary" onClick={() => setStep(2)}>{t('deals.wizard.back')}</button>
              <button type="button" className="deals-btn primary" onClick={() => void handleCreate()} disabled={loading}>
                {loading ? t('deals.wizard.creating') : t('deals.wizard.createLink')}
              </button>
            </div>
          </>
        )}
      </div>
      <p className="deals-disclaimer">{t('deals.disclaimer')}</p>
    </div>
  );
};

export default DealWizardPage;
