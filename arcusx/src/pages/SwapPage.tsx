import React from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useSwap } from '../hooks/useSwap';
import SwapCard from '../components/SwapCard';
import '../css/SwapPage.css';

const SwapPage: React.FC = () => {
  const { t } = useI18n();
  const swap = useSwap();

  return (
    <div className="swap-page">
      <div className="swap-page-container">
        {/* Header Section */}
        <div className="swap-header">
          <h1 className="swap-title">{t('swap.title')}</h1>
          <p className="swap-subtitle">{t('swap.subtitle')}</p>
        </div>

        {/* Main Swap Card */}
        <SwapCard swap={swap} />

        {/* Info Section */}
        <div className="swap-info-section">
          <div className="swap-info-card">
            <h3>{t('swap.info.title')}</h3>
            <ul className="swap-info-list">
              <li>{t('swap.info.item1')}</li>
              <li>{t('swap.info.item2')}</li>
              <li>{t('swap.info.item3')}</li>
              <li>{t('swap.info.item4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapPage;
