import React, { useState } from 'react';
import { FaExchangeAlt, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { useWallet } from '../hooks/useWallet';
import SwapInputGroup from './SwapInputGroup';
import SwapDetails from './SwapDetails';
import WalletButton from './WalletButton';
import { useSwap } from '../hooks/useSwap';
import '../css/SwapCard.css';

interface SwapCardProps {
  swap: ReturnType<typeof useSwap>;
}

const SwapCard: React.FC<SwapCardProps> = ({ swap }) => {
  const { t } = useI18n();
  const { isConnected } = useWallet();
  const { swapState, executeSwap, swapTokens, setFromAmount, setMaxAmount } = swap;
  const [showDetails, setShowDetails] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSwap = async () => {
    if (!swapState.quote) return;

    try {
      setShowConfirmModal(false);
      const result = await executeSwap();
      
      // Mostrar éxito (podrías usar un toast aquí)
      console.log('Swap exitoso:', result.txHash);
    } catch (error: any) {
      console.error('Error en swap:', error);
      // El error ya está en swapState.error
    }
  };

  const canSwap = 
    isConnected && 
    swapState.quote && 
    parseFloat(swapState.fromAmount) > 0 &&
    !swapState.loading &&
    !swapState.fetchingQuote;

  return (
    <div className="swap-card">
      {/* Swap Inputs */}
      <div className="swap-inputs-container">
        <SwapInputGroup
          label={t('swap.from')}
          token={swapState.fromToken}
          amount={swapState.fromAmount}
          balance={swapState.balances[swapState.fromToken]}
          onAmountChange={setFromAmount}
          onMaxClick={setMaxAmount}
          disabled={!isConnected}
          loading={swapState.fetchingQuote}
        />

        {/* Swap Button */}
        <div className="swap-button-container">
          <button
            className="swap-icon-button"
            onClick={swapTokens}
            disabled={!isConnected}
            aria-label={t('swap.swapTokens')}
          >
            <FaExchangeAlt />
          </button>
        </div>

        <SwapInputGroup
          label={t('swap.to')}
          token={swapState.toToken}
          amount={swapState.toAmount}
          balance={swapState.balances[swapState.toToken]}
          disabled
          loading={swapState.fetchingQuote}
        />
      </div>

      {/* Swap Details */}
      {swapState.quote && (
        <div className="swap-details-container">
          <button
            className="swap-details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            <FaInfoCircle />
            <span>{t('swap.details')}</span>
            <span className={`swap-details-arrow ${showDetails ? 'open' : ''}`}>▼</span>
          </button>
          
          {showDetails && (
            <SwapDetails
              exchangeRate={swapState.exchangeRate}
              priceImpact={swapState.priceImpact}
              slippage={swapState.slippage}
              fromToken={swapState.fromToken}
              toToken={swapState.toToken}
            />
          )}
        </div>
      )}

      {/* No Liquidity Message (Bonito) */}
      {swapState.error && (
        (swapState.error.includes('No hay ruta disponible') || 
         swapState.error.includes('No path found') ||
         swapState.error.includes('No se encontró liquidez')) ? (
          <div className="swap-no-liquidity">
            <div className="swap-no-liquidity-icon">
              <span className="liquidity-emoji">{t('swap.noLiquidity.icon')}</span>
              <FaExclamationTriangle className="warning-icon" />
            </div>
            <h3 className="swap-no-liquidity-title">{t('swap.noLiquidity.title')}</h3>
            <p className="swap-no-liquidity-message">{t('swap.noLiquidity.message')}</p>
            <p className="swap-no-liquidity-suggestion">{t('swap.noLiquidity.suggestion')}</p>
          </div>
        ) : (
          <div className="swap-error">
            {swapState.error}
          </div>
        )
      )}

      {/* Action Button */}
      <div className="swap-action-container">
        {!isConnected ? (
          <WalletButton />
        ) : (
          <button
            className={`swap-button ${canSwap ? 'enabled' : 'disabled'}`}
            onClick={() => {
              if (canSwap) {
                setShowConfirmModal(true);
              }
            }}
            disabled={!canSwap || swapState.loading}
          >
            {swapState.loading ? (
              <>
                <span className="spinner"></span>
                {t('swap.swapping')}
              </>
            ) : swapState.fetchingQuote ? (
              t('swap.fetchingQuote')
            ) : (
              t('swap.swapButton')
            )}
          </button>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="swap-confirm-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="swap-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('swap.confirm.title')}</h3>
            <div className="swap-confirm-details">
              <div className="swap-confirm-row">
                <span>{t('swap.confirm.from')}</span>
                <span>{swapState.fromAmount} {swapState.fromToken}</span>
              </div>
              <div className="swap-confirm-row">
                <span>{t('swap.confirm.to')}</span>
                <span>{swapState.toAmount} {swapState.toToken}</span>
              </div>
              {swapState.exchangeRate && (
                <div className="swap-confirm-row">
                  <span>{t('swap.confirm.rate')}</span>
                  <span>1 {swapState.fromToken} = {swapState.exchangeRate} {swapState.toToken}</span>
                </div>
              )}
              {swapState.priceImpact && (
                <div className="swap-confirm-row">
                  <span>{t('swap.confirm.priceImpact')}</span>
                  <span className={parseFloat(swapState.priceImpact) > 1 ? 'warning' : ''}>
                    {swapState.priceImpact}%
                  </span>
                </div>
              )}
            </div>
            <div className="swap-confirm-actions">
              <button
                className="swap-confirm-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                {t('swap.confirm.cancel')}
              </button>
              <button
                className="swap-confirm-ok"
                onClick={handleSwap}
              >
                {t('swap.confirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapCard;
