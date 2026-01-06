import { useEffect } from 'react';
import { MdTranslate } from 'react-icons/md';
import { useI18n } from '../i18n/I18nProvider';
import '../css/LanguageFab.css';

type Props = {
  /** Optional: show/hide outside */
  visible?: boolean;
};

export default function LanguageFab({ visible = true }: Props) {
  const { lang, toggle, t } = useI18n();

  useEffect(() => {
    // So screen readers / browsers can hint correct language
    document.documentElement.lang = lang;
  }, [lang]);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="lang-fab"
      onClick={toggle}
      aria-label={t('lang.toggle')}
      title={t('lang.toggle')}
    >
      <span className="lang-fab-icon" aria-hidden="true">
        <MdTranslate />
      </span>
      <span className="lang-fab-label">{lang === 'es' ? t('lang.en') : t('lang.es')}</span>
    </button>
  );
}
