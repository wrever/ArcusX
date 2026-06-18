import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaHandshake } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { useWallet } from '../hooks/useWallet';
import { usePayoutWallet } from '../hooks/usePayoutWallet';
import PrivateOfferWalletModal from '../components/PrivateOfferWalletModal';
import { usePlatformFee } from '../hooks/usePlatformFee';
import { DEAL_TEMPLATES, getDealTemplate, type DealTemplateId } from '../constants/dealTemplates';
import { createDeal, getDealByToken } from '../services/dealsService';
import DealShareLink from '../components/DealShareLink';
import '../css/DealsPages.css';
import { quoteBilateralFromNominal } from '../utils/bilateralFeeModel';
import EscrowFeeBreakdown from '../components/EscrowFeeBreakdown';

const STEPS = ['template', 'info', 'payment', 'review'] as const;

const DealWizardPage = () => {
  const { t } = useI18n();
  const { address, isConnected, connectWallet } = useWallet();
  const { registered: payoutRegistered, address: payoutAddress, refresh: refreshPayoutWallet } =
    usePayoutWallet();
  const [showWalletGate, setShowWalletGate] = useState(false);
  const { platformFee, loading: feeLoading } = usePlatformFee();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState<DealTemplateId>('peer_car_sale');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [iReceivePayment, setIReceivePayment] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdToken, setCreatedToken] = useState('');
  const [createdDealId, setCreatedDealId] = useState('');
  const [buyerAccepted, setBuyerAccepted] = useState(false);
  const [buyerContract, setBuyerContract] = useState(false);
  const [buyerFunded, setBuyerFunded] = useState(false);

  const tpl = useMemo(() => getDealTemplate(templateId), [templateId]);

  useEffect(() => {
    setTitle('');
    setDescription('');
    setAmount('');
    setIReceivePayment(tpl.defaultFunderRole === 'counterparty');
  }, [templateId, tpl.defaultFunderRole]);

  useEffect(() => {
    void refreshPayoutWallet().then(({ registered }) => {
      if (!registered) setShowWalletGate(true);
    });
  }, [refreshPayoutWallet]);

  const nominal = parseFloat(amount) || 0;
  const bilateral = nominal > 0 ? quoteBilateralFromNominal(nominal, platformFee) : null;
  const beneficiaryNet = bilateral?.workerNet ?? 0;
  const clientTotal = bilateral?.clientTotal ?? 0;
  const feeAmount = bilateral?.clientVisibleFee ?? 0;

  const handleCreate = async () => {
    setError('');
    if (!payoutRegistered || !payoutAddress) {
      setShowWalletGate(true);
      return;
    }
    if (!iReceivePayment && (!isConnected || !address)) {
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
      const funderRole = iReceivePayment ? 'counterparty' : 'initiator';
      const receiveWallet = payoutAddress;
      const payerWallet = address ?? receiveWallet;

      const res = await createDeal({
        template_id: templateId,
        title: title.trim(),
        description: description.trim(),
        amount_usdc: amt,
        initiator_wallet: iReceivePayment ? receiveWallet : payerWallet,
        release_signer_wallet: iReceivePayment ? receiveWallet : payerWallet,
        beneficiary_wallet: iReceivePayment ? receiveWallet : payerWallet,
        funder_role: funderRole,
      });
      const token = res.deal_token as string;
      const agreement = res.agreement as { id?: string } | undefined;
      setCreatedToken(token);
      setCreatedDealId(String(agreement?.id ?? ''));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!createdToken || !iReceivePayment) return;
    const tick = () => {
      void getDealByToken(createdToken).then((r) => {
        const st = r.deal.status;
        setBuyerAccepted(st === 'accepted' || st === 'funded' || st === 'active' || st === 'completed');
        setBuyerContract(Boolean(r.deal.escrow_contract_id));
        setBuyerFunded(st === 'funded' || st === 'active' || st === 'completed');
      });
    };
    tick();
    const id = window.setInterval(tick, 8000);
    return () => window.clearInterval(id);
  }, [createdToken, iReceivePayment]);

  const walletGateModal = (
    <PrivateOfferWalletModal
      open={showWalletGate}
      returnPath="/deals/new"
      onClose={() => {
        setShowWalletGate(false);
        void refreshPayoutWallet();
      }}
    />
  );

  if (createdToken) {
    const commerce = iReceivePayment;
    return (
      <>
      <div className="deals-page">
        <h1><FaHandshake /> {t('deals.wizard.doneTitle')}</h1>
        <p className="deals-lead">{commerce ? t('deals.wizard.doneLeadCommerce') : t('deals.wizard.doneLead')}</p>
        <div className="deals-form-card">
          {commerce && (
            <ol className="deals-commerce-steps">
              <li className="is-current">{t('deals.commerce.step1')}</li>
              <li className={buyerAccepted ? 'is-done' : ''}>{t('deals.commerce.step2')}</li>
              <li className={buyerContract ? 'is-done' : buyerAccepted ? 'is-current' : ''}>{t('deals.commerce.step3')}</li>
              <li className={buyerFunded ? 'is-done' : buyerContract ? 'is-current' : ''}>{t('deals.commerce.step4')}</li>
            </ol>
          )}
          {commerce && !buyerAccepted && (
            <p className="deals-disclaimer">{t('deals.wizard.waitBuyerAccept')}</p>
          )}
          {commerce && buyerAccepted && !buyerFunded && (
            <p className="deals-disclaimer">
              {buyerContract ? t('deals.wizard.waitBuyerPay') : t('deals.wizard.waitBuyerContract')}
            </p>
          )}
          {commerce && buyerFunded && (
            <p className="deals-commerce-ready">{t('deals.wizard.buyerPaid')}</p>
          )}
          <DealShareLink dealToken={createdToken} hint={t('deals.wizard.shareHint')} />
          <div className="deals-actions">
            <Link to="/dashboard?tab=deals" className="deals-btn secondary">{t('deals.wizard.goDashboard')}</Link>
            {createdDealId ? (
              <Link to={`/deals/workspace/${createdDealId}`} className="deals-btn secondary">{t('deals.public.openWorkspace')}</Link>
            ) : null}
          </div>
        </div>
        {error && <p className="deals-error" role="alert">{error}</p>}
        <p className="deals-disclaimer">{t('deals.disclaimer')}</p>
      </div>
      {walletGateModal}
      </>
    );
  }

  return (
    <>
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
              placeholder={t(tpl.titleKey)}
            />
            <label htmlFor="deal-desc">{t('deals.wizard.descLabel')}</label>
            <textarea
              id="deal-desc"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(tpl.descriptionKey)}
            />
            <div className="deals-actions">
              <button type="button" className="deals-btn secondary" onClick={() => setStep(0)}>{t('deals.wizard.back')}</button>
              <button type="button" className="deals-btn primary" onClick={() => setStep(2)} disabled={title.trim().length < 3}>{t('deals.wizard.next')}</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="deals-disclaimer deals-amount-hint">{t('deals.wizard.amountHint')}</p>
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
            {nominal > 0 && iReceivePayment && (
              <p className="deals-net-preview">
                {t('deals.wizard.beneficiaryNetSelf').replace('{{amount}}', beneficiaryNet.toFixed(2))}
              </p>
            )}
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
              <button type="button" className="deals-btn primary" onClick={() => setStep(3)} disabled={!isConnected || nominal <= 0}>{t('deals.wizard.next')}</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="deals-summary-row"><span>{t('deals.wizard.dealValue')}</span><strong>{nominal.toFixed(2)} USDC</strong></div>
            {iReceivePayment && (
              <div className="deals-summary-row"><span>{t('deals.wizard.beneficiaryReceives')}</span><strong>{beneficiaryNet.toFixed(2)} USDC</strong></div>
            )}
            <div className="deals-summary-row deals-summary-fee">
              <span>{t('deals.wizard.fee')}</span>
              <div>
                {feeLoading ? (
                  <strong>…</strong>
                ) : (
                  <EscrowFeeBreakdown
                    platformFee={platformFee}
                    totalUsdc={feeAmount.toFixed(2)}
                    variant="employer-bilateral"
                  />
                )}
              </div>
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
    {walletGateModal}
    </>
  );
};

export default DealWizardPage;
