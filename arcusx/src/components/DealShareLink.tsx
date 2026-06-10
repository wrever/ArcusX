import { useState } from 'react';
import { FaCheck, FaCopy, FaLink } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { dealPublicUrl } from '../services/dealsService';

type DealShareLinkProps = {
  dealToken: string;
  hint?: string;
  compact?: boolean;
};

const DealShareLink = ({ dealToken, hint, compact = false }: DealShareLinkProps) => {
  const { t } = useI18n();
  const url = dealPublicUrl(dealToken);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* fallback: select input */
    }
  };

  return (
    <div className={`deals-share-link${compact ? ' deals-share-link--compact' : ''}`}>
      <div className="deals-share-link__header">
        <FaLink className="deals-share-link__icon" aria-hidden />
        <div>
          <p className="deals-share-link__title">{t('deals.share.title')}</p>
          {hint && <p className="deals-share-link__hint">{hint}</p>}
        </div>
      </div>
      <div className="deals-share-link__row">
        <input
          type="text"
          className="deals-share-link__input"
          readOnly
          value={url}
          aria-label={t('deals.share.urlLabel')}
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className={`deals-btn primary deals-share-link__copy${copied ? ' is-copied' : ''}`}
          onClick={() => void copy()}
        >
          {copied ? <FaCheck /> : <FaCopy />}
          {copied ? t('deals.wizard.copied') : t('deals.wizard.copyLink')}
        </button>
      </div>
      <p className="deals-share-link__secure">{t('deals.share.uniqueNote')}</p>
    </div>
  );
};

export default DealShareLink;
