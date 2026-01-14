import React from 'react';
import { useI18n } from '../i18n/I18nProvider';
import '../css/SwapDetails.css';

interface SwapDetailsProps {
  exchangeRate: string | null;
  priceImpact: string | null;
  slippage: number;
  fromToken: 'XLM' | 'USDC';
  toToken: 'XLM' | 'USDC';
}

const SwapDetails: React.FC<SwapDetailsProps> = ({
  exchangeRate,
  priceImpact,
  slippage,
  fromToken,
  toToken
}) => {
  const { t } = useI18n();

  const priceImpactNum = priceImpact ? parseFloat(priceImpact) : 0;
  const isHighImpact = priceImpactNum > 1;

  return (
    <div className="swap-details">
      <div className="swap-details-row">
        <span className="swap-details-label">{t('swap.details.rate')}</span>
        <span className="swap-details-value">
          {exchangeRate 
            ? `1 ${fromToken} = ${exchangeRate} ${toToken}`
            : '-'
          }
        </span>
      </div>

      {priceImpact && (
        <div className="swap-details-row">
          <span className="swap-details-label">{t('swap.details.priceImpact')}</span>
          <span className={`swap-details-value ${isHighImpact ? 'warning' : ''}`}>
            {priceImpact}%
          </span>
        </div>
      )}

      <div className="swap-details-row">
        <span className="swap-details-label">{t('swap.details.slippage')}</span>
        <span className="swap-details-value">{slippage}%</span>
      </div>

      <div className="swap-details-row">
        <span className="swap-details-label">{t('swap.details.networkFee')}</span>
        <span className="swap-details-value">~0.00001 XLM</span>
      </div>
    </div>
  );
};

export default SwapDetails;
