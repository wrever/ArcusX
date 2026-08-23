import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { MAIN_SITE_URL } from '../../config/enterpriseSite';
import {
  DOCS_CHAPTERS,
  DOCS_LEGAL_NAV,
  docsLangFromApp,
  type DocsLang,
} from '../../content/docs/publicDocs';
import { useI18n } from '../../i18n/I18nProvider';
import logoDark from '../../images/arcus-logo.png';
import logoLight from '../../images/arcusxlogoclaro.png';
import { useTheme } from '../../contexts/ThemeContext';
import { DocsSearchTrigger } from './DocsSearch';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageFab from '../../components/LanguageFab';

type Props = {
  open: boolean;
  onNavigate: () => void;
  onOpenSearch: () => void;
};

export default function DocsSidebar({ open, onNavigate, onOpenSearch }: Props) {
  const { lang, t } = useI18n();
  const docsLang = docsLangFromApp(lang);
  const label = (item: { label: Record<DocsLang, string> }) =>
    item.label[docsLang] || item.label.en;
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DOCS_CHAPTERS.map((c) => [c.id, true])),
  );

  return (
    <aside className={`ax-docs__sidebar${open ? ' ax-docs__sidebar--open' : ''}`}>
      <div className="ax-docs__sidebar-search">
        <DocsSearchTrigger onOpen={onOpenSearch} />
      </div>

      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `ax-docs__side-link ax-docs__side-link--home${isActive ? ' ax-docs__side-link--active' : ''}`
        }
        onClick={onNavigate}
      >
        {t('docs.nav.home')}
      </NavLink>

      {DOCS_CHAPTERS.map((chapter) => {
        const expanded = openChapters[chapter.id] !== false;
        const audienceKey =
          chapter.audience === 'human' ? 'docs.audience.human' : 'docs.audience.tech';
        const prev = DOCS_CHAPTERS[DOCS_CHAPTERS.indexOf(chapter) - 1];
        const showAudience = !prev || prev.audience !== chapter.audience;
        return (
          <div key={chapter.id} className="ax-docs__chapter">
            {showAudience && (
              <p className={`ax-docs__audience-label ax-docs__audience-label--${chapter.audience}`}>
                {t(audienceKey)}
              </p>
            )}
            <button
              type="button"
              className="ax-docs__chapter-toggle"
              onClick={() =>
                setOpenChapters((prev) => ({ ...prev, [chapter.id]: !expanded }))
              }
              aria-expanded={expanded}
            >
              <span>{label(chapter)}</span>
              <span className="ax-docs__chevron" data-open={expanded ? '1' : '0'}>
                ▾
              </span>
            </button>
            {expanded && (
              <div className="ax-docs__chapter-articles">
                {chapter.articles.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `ax-docs__side-link ax-docs__side-link--article${isActive ? ' ax-docs__side-link--active' : ''}`
                    }
                    onClick={onNavigate}
                  >
                    {label(item)}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <p className="ax-docs__side-label">{t('docs.nav.legal')}</p>
      {DOCS_LEGAL_NAV.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `ax-docs__side-link${isActive ? ' ax-docs__side-link--active' : ''}`
          }
          onClick={onNavigate}
        >
          {label(item)}
        </NavLink>
      ))}
    </aside>
  );
}

export function DocsNavbar({
  onMenu,
  onOpenSearch,
}: {
  onMenu: () => void;
  onOpenSearch: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const logo = theme === 'light' ? logoLight : logoDark;

  return (
    <header className="ax-docs__nav">
      <div className="ax-docs__nav-left">
        <button type="button" className="ax-docs__menu-btn" onClick={onMenu} aria-label="Menú">
          Menú
        </button>
        <Link to="/" className="ax-docs__brand">
          <img src={logo} alt="" />
          <span className="ax-docs__brand-text">ArcusX Docs</span>
        </Link>
      </div>
      <div className="ax-docs__nav-center">
        <DocsSearchTrigger onOpen={onOpenSearch} />
      </div>
      <div className="ax-docs__nav-actions">
        <div className="ax-docs__nav-tools">
          <ThemeToggle visible variant="inline" />
          <LanguageFab visible variant="inline" />
        </div>
        <a className="ax-docs__cta" href={MAIN_SITE_URL}>
          {t('docs.nav.openApp')}
        </a>
      </div>
    </header>
  );
}
