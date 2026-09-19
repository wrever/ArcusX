import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo } from 'react';
import DocsArticle from './DocsArticle';
import DocsSidebar, { DocsNavbar } from './DocsSidebar';
import DocsSearch from './DocsSearch';
import { DOCS_PAGES } from '../../content/docs/publicDocs';
import '../../css/DocsSite.css';

export default function DocsApp() {
  return <DocsShell />;
}

function DocsShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  const pagePaths = useMemo(() => Object.keys(DOCS_PAGES), []);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="ax-docs">
      <DocsNavbar onMenu={() => setMenuOpen((v) => !v)} onOpenSearch={openSearch} />
      <DocsSearch open={searchOpen} onClose={closeSearch} />
      <div
        className={`ax-docs__backdrop${menuOpen ? ' ax-docs__backdrop--open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden
      />
      <div className="ax-docs__shell">
        <DocsSidebar
          open={menuOpen}
          onNavigate={() => setMenuOpen(false)}
          onOpenSearch={openSearch}
        />
        <Routes>
          {pagePaths.map((p) => (
            <Route key={p} path={p} element={<DocsArticle path={p} />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
