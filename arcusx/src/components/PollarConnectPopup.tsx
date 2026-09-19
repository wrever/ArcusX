import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaSpinner } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import {
  cancelPollarLogin,
  reusePollarSessionIfAny,
  startPollarLogin,
  verifyPollarEmailCode,
  type PollarLoginProvider,
} from '../services/pollarWallet';
import {
  clearPollarOAuthPopup,
  openPollarOAuthPopup,
} from '../services/pollarOAuthPopup';
import '../css/WalletConnectPopup.css';
import '../css/PollarConnectPopup.css';

interface PollarConnectPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (address: string) => void;
}

type Step = 'providers' | 'email' | 'otp' | 'working';

const PollarConnectPopup: React.FC<PollarConnectPopupProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('providers');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('wallet-modal-open');
    setStep('providers');
    setEmail('');
    setOtp('');
    setBusy(false);
    setError(null);

    let cancelled = false;
    void (async () => {
      try {
        const existing = await reusePollarSessionIfAny();
        if (!cancelled && existing?.address) {
          onConnected(existing.address);
        }
      } catch {
        /* ignore — user can login manually */
      }
    })();

    return () => {
      cancelled = true;
      document.body.classList.remove('wallet-modal-open');
    };
  }, [isOpen, onConnected]);

  if (!isOpen) return null;

  const finishWithAddress = (address: string) => {
    setBusy(false);
    onConnected(address);
  };

  const handleClose = () => {
    cancelPollarLogin();
    clearPollarOAuthPopup();
    setBusy(false);
    setError(null);
    onClose();
  };

  const closeOAuthPopupIfOpen = () => {
    try {
      const w = window.open('', 'arcusx_pollar_oauth');
      w?.close();
    } catch {
      /* ignore */
    }
    clearPollarOAuthPopup();
  };

  const runProvider = async (provider: Exclude<PollarLoginProvider, 'email'>) => {
    setBusy(true);
    setError(null);
    setStep('working');

    // Reservar popup en el mismo tick del click (si no → about:blank / bloqueado).
    const popup = openPollarOAuthPopup();
    if (!popup) {
      setBusy(false);
      setStep('providers');
      setError(t('wallet.pollar.error.popupBlocked'));
      return;
    }

    try {
      const result = await startPollarLogin(provider);
      closeOAuthPopupIfOpen();
      if ('address' in result) {
        finishWithAddress(result.address);
        return;
      }
      setError(t('wallet.pollar.error.unexpected'));
      setStep('providers');
    } catch (err: unknown) {
      closeOAuthPopupIfOpen();
      const msg = err instanceof Error ? err.message : t('wallet.pollar.error.generic');
      setError(msg);
      setStep('providers');
    } finally {
      setBusy(false);
    }
  };

  const sendEmailCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startPollarLogin('email', email);
      if ('address' in result) {
        finishWithAddress(result.address);
        return;
      }
      setStep('otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('wallet.pollar.error.generic');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const confirmOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const { address } = await verifyPollarEmailCode(otp);
      finishWithAddress(address);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('wallet.pollar.error.generic');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="wallet-popup-overlay pollar-connect-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) handleClose();
      }}
    >
      <div className="wallet-popup-content pollar-connect-content" onClick={(e) => e.stopPropagation()}>
        <button className="wallet-popup-close" onClick={handleClose} type="button" disabled={busy}>
          ×
        </button>

        <div className="wallet-popup-header">
          <h2 className="wallet-popup-title">{t('wallet.pollar.title')}</h2>
          <p className="wallet-popup-description">{t('wallet.pollar.description')}</p>
        </div>

        {error ? <p className="pollar-connect-error">{error}</p> : null}

        {step === 'providers' || step === 'working' ? (
          <div className="wallet-options pollar-connect-options">
            <button
              className="wallet-option pollar-option"
              type="button"
              disabled={busy}
              onClick={() => void runProvider('google')}
            >
              <span className="wallet-name">{t('wallet.pollar.google')}</span>
            </button>
            <button
              className="wallet-option pollar-option"
              type="button"
              disabled={busy}
              onClick={() => void runProvider('github')}
            >
              <span className="wallet-name">{t('wallet.pollar.github')}</span>
            </button>
            <button
              className="wallet-option pollar-option"
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setStep('email');
              }}
            >
              <span className="wallet-name">{t('wallet.pollar.email')}</span>
            </button>
          </div>
        ) : null}

        {step === 'email' ? (
          <div className="pollar-connect-form">
            <label className="pollar-connect-label" htmlFor="pollar-email">
              {t('wallet.pollar.emailLabel')}
            </label>
            <input
              id="pollar-email"
              className="pollar-connect-input"
              type="email"
              autoComplete="email"
              value={email}
              disabled={busy}
              placeholder="you@email.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void sendEmailCode();
              }}
            />
            <div className="pollar-connect-actions">
              <button type="button" className="pollar-connect-secondary" disabled={busy} onClick={() => setStep('providers')}>
                {t('wallet.pollar.back')}
              </button>
              <button type="button" className="pollar-connect-primary" disabled={busy || !email.includes('@')} onClick={() => void sendEmailCode()}>
                {busy ? <FaSpinner className="spinner" /> : null}
                {t('wallet.pollar.sendCode')}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'otp' ? (
          <div className="pollar-connect-form">
            <p className="pollar-connect-hint">
              {t('wallet.pollar.otpHint')} {email}
            </p>
            <label className="pollar-connect-label" htmlFor="pollar-otp">
              {t('wallet.pollar.otpLabel')}
            </label>
            <input
              id="pollar-otp"
              className="pollar-connect-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              disabled={busy}
              placeholder="123456"
              onChange={(e) => setOtp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmOtp();
              }}
            />
            <div className="pollar-connect-actions">
              <button type="button" className="pollar-connect-secondary" disabled={busy} onClick={() => setStep('email')}>
                {t('wallet.pollar.back')}
              </button>
              <button type="button" className="pollar-connect-primary" disabled={busy || otp.trim().length < 4} onClick={() => void confirmOtp()}>
                {busy ? <FaSpinner className="spinner" /> : null}
                {t('wallet.pollar.verify')}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'working' ? (
          <p className="pollar-connect-working">
            <FaSpinner className="spinner" /> {t('wallet.pollar.working')}
          </p>
        ) : null}

        <p className="pollar-connect-footnote">{t('wallet.pollar.footnote')}</p>
      </div>
    </div>,
    document.body,
  );
};

export default PollarConnectPopup;
