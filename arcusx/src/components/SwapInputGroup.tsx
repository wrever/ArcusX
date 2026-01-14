import React from 'react';
import { FaCoins } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import '../css/SwapInputGroup.css';

interface SwapInputGroupProps {
  label: string;
  token: 'XLM' | 'USDC';
  amount: string;
  balance: string;
  onAmountChange?: (amount: string) => void;
  onMaxClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const SwapInputGroup: React.FC<SwapInputGroupProps> = ({
  label,
  token,
  amount,
  balance,
  onAmountChange,
  onMaxClick,
  disabled = false,
  loading = false
}) => {
  const { t } = useI18n();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir números, punto decimal y vacío
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onAmountChange?.(value);
    }
  };

  return (
    <div className="swap-input-group">
      <div className="swap-input-header">
        <label className="swap-input-label">{label}</label>
        {balance !== '0' && (
          <span className="swap-input-balance">
            {t('swap.balance')}: {balance} {token}
          </span>
        )}
      </div>
      
      <div className="swap-input-wrapper">
        <div className="swap-input-container">
          <input
            type="text"
            className="swap-input"
            value={amount}
            onChange={handleInputChange}
            placeholder="0.0"
            disabled={disabled || loading}
            inputMode="decimal"
          />
          {loading && (
            <div className="swap-input-loading">
              <span className="spinner-small"></span>
            </div>
          )}
        </div>
        
        <div className="swap-token-selector">
          <div className="swap-token-icon">
            <FaCoins />
          </div>
          <span className="swap-token-symbol">{token}</span>
        </div>
      </div>

      {onMaxClick && !disabled && balance !== '0' && (
        <button
          className="swap-max-button"
          onClick={onMaxClick}
          type="button"
        >
          {t('swap.max')}
        </button>
      )}
    </div>
  );
};

export default SwapInputGroup;
