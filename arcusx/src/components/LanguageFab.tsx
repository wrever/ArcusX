import { useEffect, useRef, useState } from 'react';
import { MdTranslate } from 'react-icons/md';
import { useI18n } from '../i18n/I18nProvider';
import type { Lang } from '../i18n/translations';
import '../css/LanguageFab.css';

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'es', label: 'ES' },
  { value: 'en', label: 'EN' },
  { value: 'pt', label: 'PT' },
];

type Props = {
  /** Optional: show/hide outside */
  visible?: boolean;
  /** 'fab' = floating button (fixed position), 'inline' = for header/toolbar */
  variant?: 'fab' | 'inline';
  /** Solo landing B2B: FAB pegado a la izquierda (el sitio general mantiene la posición por defecto) */
  fabAlign?: 'default' | 'enterprise-left';
};

export default function LanguageFab({
  visible = true,
  variant = 'fab',
  fabAlign = 'default',
}: Props) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!visible) return null;

  const currentLabel = LANG_OPTIONS.find((o) => o.value === lang)?.label ?? lang.toUpperCase();

  return (
    <div
      ref={containerRef}
      className={`lang-select lang-select--${variant}${fabAlign === 'enterprise-left' && variant === 'fab' ? ' lang-select--fab--enterprise-left' : ''}`}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-label={t('lang.toggle')}
    >
      <button
        type="button"
        className="lang-select-trigger"
        onClick={() => setOpen(!open)}
        title={t('lang.toggle')}
        aria-label={t('lang.toggle')}
      >
        <span className="lang-select-icon" aria-hidden="true">
          <MdTranslate />
        </span>
        <span className="lang-select-label">{currentLabel}</span>
        <span className="lang-select-chevron" aria-hidden="true">
          ▼
        </span>
      </button>
      {open && (
        <div
          className="lang-select-dropdown"
          role="listbox"
          aria-label={t('lang.aria')}
        >
          {LANG_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={lang === option.value}
              className={`lang-select-option ${lang === option.value ? 'active' : ''}`}
              onClick={() => {
                setLang(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
