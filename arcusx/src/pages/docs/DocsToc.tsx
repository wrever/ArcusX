import { useEffect, useMemo, useState } from 'react';
import type { DocsBlock } from '../../content/docs/publicDocs';
import { useI18n } from '../../i18n/I18nProvider';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function extractToc(blocks: DocsBlock[]): { id: string; text: string }[] {
  return blocks
    .filter((b): b is Extract<DocsBlock, { type: 'h2' }> => b.type === 'h2')
    .map((b) => ({ id: slugify(b.text), text: b.text }));
}

export default function DocsToc({ items }: { items: { id: string; text: string }[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState(items[0]?.id || '');

  const ids = useMemo(() => items.map((i) => i.id), [items]);

  useEffect(() => {
    if (!ids.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [ids]);

  if (!items.length) return null;

  return (
    <aside className="ax-docs__toc" aria-label={t('docs.toc.title')}>
      <p className="ax-docs__toc-title">{t('docs.toc.title')}</p>
      <nav>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={active === item.id ? 'is-active' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActive(item.id);
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export function headingId(text: string): string {
  return slugify(text);
}
