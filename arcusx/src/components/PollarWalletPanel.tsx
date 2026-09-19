import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCopy, FaExchangeAlt, FaRedo, FaSignOutAlt, FaTimes, FaWallet } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { getUsdcIssuer } from '../config/usdc';
import {
  executePollarSwap,
  fetchPollarBalances,
  isPollarSwapEnabled,
  quotePollarSwap,
  type PollarAssetBalance,
} from '../services/pollarWallet';
import type { SwapQuote } from '@pollar/core';
import '../css/PollarWalletPanel.css';

type Props = {
  open: boolean;
  address: string;
  onClose: () => void;
  onDisconnect: () => void;
};

function fmt(amount: string | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

const PollarWalletPanel: React.FC<Props> = ({ open, address, onClose, onDisconnect }) => {
  const { t } = useI18n();
  const [balances, setBalances] = useState<PollarAssetBalance[]>([]);
  const [loadingBal, setLoadingBal] = useState(false);
  const [balError, setBalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [swapEnabled, setSwapEnabled] = useState(false);
  const [fromToken, setFromToken] = useState<'XLM' | 'USDC'>('XLM');
  const [toToken, setToToken] = useState<'XLM' | 'USDC'>('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapMsg, setSwapMsg] = useState<string | null>(null);
  const [swapErr, setSwapErr] = useState<string | null>(null);

  const usdcIssuer = getUsdcIssuer();

  const xlmBal = useMemo(
    () => balances.find((b) => b.code === 'XLM' || b.type === 'native')?.available ?? '0',
    [balances],
  );
  const usdcBal = useMemo(
    () =>
      balances.find(
        (b) => b.code === 'USDC' && (!b.issuer || b.issuer === usdcIssuer),
      )?.available ??
      balances.find((b) => b.code === 'USDC')?.available ??
      '0',
    [balances, usdcIssuer],
  );

  const refresh = useCallback(async () => {
    setLoadingBal(true);
    setBalError(null);
    try {
      const rows = await fetchPollarBalances();
      setBalances(rows);
    } catch (e) {
      setBalError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingBal(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    void isPollarSwapEnabled().then(setSwapEnabled);
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const flipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setQuote(null);
    setSwapMsg(null);
    setSwapErr(null);
  };

  const requestQuote = async () => {
    const amt = fromAmount.trim();
    if (!amt || Number(amt) <= 0) return;
    setQuoteLoading(true);
    setSwapErr(null);
    setSwapMsg(null);
    setQuote(null);
    try {
      const q = await quotePollarSwap({
        from: fromToken,
        to: toToken,
        amount: amt,
        usdcIssuer,
      });
      setQuote(q);
    } catch (e) {
      setSwapErr(e instanceof Error ? e.message : String(e));
    } finally {
      setQuoteLoading(false);
    }
  };

  const runSwap = async () => {
    if (!quote) return;
    setSwapLoading(true);
    setSwapErr(null);
    setSwapMsg(null);
    try {
      const { txHash } = await executePollarSwap(quote);
      setSwapMsg(
        txHash
          ? t('wallet.pollar.panel.swapOkHash').replace('{hash}', `${txHash.slice(0, 8)}…`)
          : t('wallet.pollar.panel.swapOk'),
      );
      setQuote(null);
      setFromAmount('');
      await refresh();
    } catch (e) {
      setSwapErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSwapLoading(false);
    }
  };

  if (!open) return null;

  const fromBal = fromToken === 'XLM' ? xlmBal : usdcBal;

  return (
    <div className="pollar-wallet-panel" role="dialog" aria-label={t('wallet.pollar.panel.title')}>
      <div className="pollar-wallet-panel__head">
        <div className="pollar-wallet-panel__title">
          <FaWallet />
          <span>{t('wallet.pollar.panel.title')}</span>
          <span className="pollar-wallet-panel__badge">Pollar</span>
        </div>
        <button type="button" className="pollar-wallet-panel__icon-btn" onClick={onClose} aria-label={t('wallet.pollar.panel.close')}>
          <FaTimes />
        </button>
      </div>

      <div className="pollar-wallet-panel__addr">
        <code title={address}>{address}</code>
        <button type="button" className="pollar-wallet-panel__icon-btn" onClick={() => void copyAddress()}>
          <FaCopy />
        </button>
        {copied ? <span className="pollar-wallet-panel__hint">{t('wallet.pollar.panel.copied')}</span> : null}
      </div>

      <div className="pollar-wallet-panel__section">
        <div className="pollar-wallet-panel__section-head">
          <h4>{t('wallet.pollar.panel.balances')}</h4>
          <button
            type="button"
            className="pollar-wallet-panel__icon-btn"
            onClick={() => void refresh()}
            disabled={loadingBal}
            aria-label={t('wallet.pollar.panel.refresh')}
          >
            <FaRedo className={loadingBal ? 'spin' : undefined} />
          </button>
        </div>
        {balError ? <p className="pollar-wallet-panel__error">{balError}</p> : null}
        <ul className="pollar-wallet-panel__balances">
          <li>
            <span>XLM</span>
            <strong>{fmt(xlmBal)}</strong>
          </li>
          <li>
            <span>USDC</span>
            <strong>{fmt(usdcBal)}</strong>
          </li>
          {balances
            .filter((b) => b.code !== 'XLM' && b.code !== 'USDC' && b.type !== 'native')
            .slice(0, 4)
            .map((b) => (
              <li key={`${b.code}:${b.issuer ?? ''}`}>
                <span>{b.code}</span>
                <strong>{fmt(b.available)}</strong>
              </li>
            ))}
        </ul>
      </div>

      {swapEnabled ? (
        <div className="pollar-wallet-panel__section">
          <div className="pollar-wallet-panel__section-head">
            <h4>{t('wallet.pollar.panel.swap')}</h4>
          </div>
          <div className="pollar-wallet-panel__swap-row">
            <select
              value={fromToken}
              onChange={(e) => {
                const next = e.target.value as 'XLM' | 'USDC';
                setFromToken(next);
                setToToken(next === 'XLM' ? 'USDC' : 'XLM');
                setQuote(null);
              }}
            >
              <option value="XLM">XLM</option>
              <option value="USDC">USDC</option>
            </select>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => {
                setFromAmount(e.target.value);
                setQuote(null);
              }}
            />
            <button type="button" className="pollar-wallet-panel__max" onClick={() => setFromAmount(fromBal)}>
              MAX
            </button>
          </div>
          <div className="pollar-wallet-panel__swap-meta">
            <span>
              {t('wallet.pollar.panel.available')}: {fmt(fromBal)} {fromToken}
            </span>
            <button type="button" className="pollar-wallet-panel__flip" onClick={flipTokens} aria-label={t('wallet.pollar.panel.flip')}>
              <FaExchangeAlt /> {toToken}
            </button>
          </div>
          {quote ? (
            <p className="pollar-wallet-panel__quote">
              ≈ {fmt(quote.amountOut)} {toToken}
              {quote.provider ? ` · ${quote.provider}` : ''}
            </p>
          ) : null}
          {swapErr ? <p className="pollar-wallet-panel__error">{swapErr}</p> : null}
          {swapMsg ? <p className="pollar-wallet-panel__ok">{swapMsg}</p> : null}
          <div className="pollar-wallet-panel__swap-actions">
            <button type="button" className="pollar-wallet-panel__btn secondary" onClick={() => void requestQuote()} disabled={quoteLoading || !fromAmount}>
              {quoteLoading ? t('wallet.pollar.panel.quoting') : t('wallet.pollar.panel.getQuote')}
            </button>
            <button type="button" className="pollar-wallet-panel__btn primary" onClick={() => void runSwap()} disabled={!quote || swapLoading}>
              {swapLoading ? t('wallet.pollar.panel.swapping') : t('wallet.pollar.panel.confirmSwap')}
            </button>
          </div>
        </div>
      ) : (
        <p className="pollar-wallet-panel__hint-block">{t('wallet.pollar.panel.swapDisabled')}</p>
      )}

      <button type="button" className="pollar-wallet-panel__btn danger" onClick={onDisconnect}>
        <FaSignOutAlt /> {t('wallet.pollar.panel.disconnect')}
      </button>
    </div>
  );
};

export default PollarWalletPanel;
