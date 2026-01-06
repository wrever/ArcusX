import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from './translations';
import { translations } from './translations';

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
  toggle: () => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'arcusx.lang';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') setLangState(saved);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  };

  const toggle = () => setLang(lang === 'es' ? 'en' : 'es');

  const t = (key: string, fallback?: string) => {
    return translations[lang]?.[key] ?? fallback ?? key;
  };

  const value = useMemo(() => ({ lang, setLang, t, toggle }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
