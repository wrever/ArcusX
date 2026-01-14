import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../css/Navbar.css';
import logoDark from '../images/arcus-logo.png';
import logoLight from '../images/arcusxlogoclaro.png';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const { t } = useI18n();
  const { theme } = useTheme();
  const logo = theme === 'light' ? logoLight : logoDark;

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
          <Link to="/swap" className="nav-link" onClick={closeMenu}>
            {t('nav.swap')}
          </Link>
          <a 
            href="https://docs.arcusx.pro" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-link"
            onClick={closeMenu}
          >
            {t('nav.docs')}
          </a>
          <a 
            href="https://github.com/ArcusX" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-link"
            onClick={closeMenu}
          >
            {t('nav.github')}
          </a>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-button login" onClick={closeMenu}>
                {t('nav.dashboard')}
              </Link>
              <button onClick={handleLogout} className="nav-button register">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-button login" onClick={closeMenu}>
                {t('nav.login')}
              </Link>
              <Link to="/register" className="nav-button register" onClick={closeMenu}>
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 