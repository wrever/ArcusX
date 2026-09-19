import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import '../css/Navbar.css';
import logoDark from '../images/arcus-logo.png';
import logoLight from '../images/arcusxlogoclaro.png';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../contexts/ThemeContext';
import { dashboardTabHref } from '../config/dashboardTabs';
import { DOCS_SITE_URL } from '../config/docsSite';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';

function normalizePath(p: string) {
  return p.replace(/\/index\.html$/i, '').replace(/\/$/, '') || '/';
}

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, logout } = useAuth();
  const { t } = useI18n();
  const { theme } = useTheme();
  const enterprise = useEnterpriseMode();
  const logo = theme === 'light' ? logoLight : logoDark;
  const privateOffersHref = dashboardTabHref('private-offers', enterprise);

  const path = useMemo(() => normalizePath(pathname), [pathname]);

  const navLinkCls = (to: string, extra = '') => {
    const target = normalizePath(to);
    const active =
      (to === '/' && path === '/') ||
      (to !== '/' && path === target) ||
      (to === '/dashboard' && path.startsWith('/dashboard'));
    return ['nav-link', extra, active ? 'nav-link--active' : ''].filter(Boolean).join(' ');
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };


  const handleLogout = async () => {
    try {
      await logout();
    closeMenu();
      // Forzar recarga completa para limpiar todo el estado
      window.location.href = '/';
    } catch (error) {
      // Aún así redirigir
      window.location.href = '/';
    }
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''} ${isMenuOpen ? 'menu-open' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <img src={logo} alt="ArcusX Logo" className="logo-img" />
        </Link>
        
        <div className="hamburger" onClick={toggleMenu}>
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
        </div>
        
        <div className={`navbar-links ${isMenuOpen ? 'open' : ''}`}>
          <div className="navbar-links__section navbar-links__section--nav">
            <Link to="/" className={navLinkCls('/')} onClick={closeMenu} aria-current={path === '/' ? 'page' : undefined}>
              {t('nav.home')}
            </Link>
            <Link to="/swap" className={navLinkCls('/swap')} onClick={closeMenu} aria-current={path === '/swap' ? 'page' : undefined}>
              {t('nav.swap')}
            </Link>
            <Link to="/tutoriales" className={navLinkCls('/tutoriales')} onClick={closeMenu} aria-current={path === '/tutoriales' ? 'page' : undefined}>
              {t('nav.tutorials')}
            </Link>
            <a
              href={DOCS_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link nav-link--external"
              onClick={closeMenu}
            >
              {t('nav.docs')}
            </a>
          </div>

          <div className="navbar-links__section navbar-links__section--cta">
            <div className="navbar-cta-shell">
              <Link
                to="/empresas"
                className={navLinkCls('/empresas', 'nav-link--empresas')}
                onClick={closeMenu}
                aria-current={path === '/empresas' ? 'page' : undefined}
              >
                {t('nav.empresas')}
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`nav-button login${
                      path.startsWith('/dashboard') &&
                      !(path === '/dashboard' && searchParams.get('tab') === 'private-offers')
                        ? ' nav-button--active'
                        : ''
                    }`}
                    onClick={closeMenu}
                    aria-current={
                      path.startsWith('/dashboard') &&
                      !(path === '/dashboard' && searchParams.get('tab') === 'private-offers')
                        ? 'page'
                        : undefined
                    }
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Link
                    to={privateOffersHref}
                    className={`nav-button login${
                      path === '/dashboard' && searchParams.get('tab') === 'private-offers'
                        ? ' nav-button--active'
                        : ''
                    }`}
                    onClick={closeMenu}
                    aria-current={
                      path === '/dashboard' && searchParams.get('tab') === 'private-offers' ? 'page' : undefined
                    }
                  >
                    {t('nav.privateOffers')}
                  </Link>
                  <button type="button" onClick={handleLogout} className="nav-button register">
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`nav-button login${path === '/login' ? ' nav-button--active' : ''}`}
                    onClick={closeMenu}
                    aria-current={path === '/login' ? 'page' : undefined}
                  >
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" className="nav-button register" onClick={closeMenu}>
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 