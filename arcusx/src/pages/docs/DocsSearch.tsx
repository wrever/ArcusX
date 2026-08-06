import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DOCS_CHAPTERS,
  DOCS_LEGAL_NAV,
  DOCS_PAGES,
  docsLangFromApp,
  type DocsLang,
} from '../../content/docs/publicDocs';
import { useI18n } from '../../i18n/I18nProvider';

type Hit = { path: string; title: string; snippet: string };

function buildIndex(lang: DocsLang): Hit[] {
  const hits: Hit[] = [];
  for (const [path, byLang] of Object.entries(DOCS_PAGES)) {
    const page = byLang[lang] || byLang.en;
    const parts = [
      page.title,
      page.description || '',
      ...page.blocks.flatMap((b) => {
        if (b.type === 'p' || b.type === 'h2' || b.type === 'h3' || b.type === 'callout' || b.type === 'code') {
          return [b.text];
        }
        if (b.type === 'ul' || b.type === 'ol') return b.items;
        if (b.type === 'table') return [...b.headers, ...b.rows.flat()];
        if (b.type === 'linkTable') return b.rows.flatMap((r) => [r.label, r.blurb]);
        return [];
      }),
    ];
    hits.push({
      path,
      title: page.title,
      snippet: parts.join(' ').replace(/\s+/g, ' ').slice(0, 220),
    });
  }
  for (const ch of DOCS_CHAPTERS) {
    hits.push({
      path: ch.articles[0]?.path || '/',
      title: ch.label[lang] || ch.label.en,
      snippet: ch.blurb[lang] || ch.blurb.en,
    });
  }
  for (const item of DOCS_LEGAL_NAV) {
    hits.push({
      path: item.path,
      title: item.label[lang] || item.label.en,
      snippet: item.path,
    });
  }
  return hits;
}

export default function DocsSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const docsLang = docsLangFromApp(lang);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildIndex(docsLang), [docsLang]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return index.slice(0, 8);
    return index
      .filter(
        (h) =>
          h.title.toLowerCase().includes(needle) ||
          h.snippet.toLowerCase().includes(needle) ||
          h.path.toLowerCase().includes(needle),
      )
      .slice(0, 12);
  }, [q, index]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ax-docs-search" role="dialog" aria-modal="true" aria-label={t('docs.search.title')}>
      <button type="button" className="ax-docs-search__backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="ax-docs-search__panel">
        <input
          ref={inputRef}
          className="ax-docs-search__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('docs.search.placeholder')}
        />
        <ul className="ax-docs-search__list">
          {results.length === 0 && <li className="ax-docs-search__empty">{t('docs.search.empty')}</li>}
          {results.map((hit) => (
            <li key={`${hit.path}-${hit.title}`}>
              <button
                type="button"
                className="ax-docs-search__hit"
                onClick={() => {
                  navigate(hit.path);
                  onClose();
                }}
              >
                <strong>{hit.title}</strong>
                <span>{hit.path}</span>
                <em>{hit.snippet}</em>
              </button>
            </li>
          ))}
        </ul>
        <p className="ax-docs-search__hint">
          <kbd>Esc</kbd> {t('docs.search.close')} · <kbd>⌘</kbd>
          <kbd>K</kbd> {t('docs.search.open')}
        </p>
      </div>
    </div>
  );
}

export function DocsSearchTrigger({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" className="ax-docs-search-trigger" onClick={onOpen}>
      <span>{t('docs.search.placeholder')}</span>
      <kbd>⌘K</kbd>
    </button>
  );
}
