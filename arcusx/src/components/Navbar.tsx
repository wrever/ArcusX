import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaLightbulb, FaStar, FaUsers, FaQuestionCircle, FaTachometerAlt, FaSignOutAlt, FaSignInAlt, FaUserPlus } from 'react-icons/fa';
import '../css/Navbar.css';
import logo from '../images/arcus-logo.png';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/I18nProvider';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const { t } = useI18n();

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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      closeMenu();
    }
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
          <a onClick={() => scrollToSection('problematica')} className="nav-link">
            {t('nav.problem')}
          </a>
          <a onClick={() => scrollToSection('solucion')} className="nav-link">
            {t('nav.solution')}
          </a>
          <a onClick={() => scrollToSection('caracteristicas')} className="nav-link">
            {t('nav.features')}
          </a>
          <a onClick={() => scrollToSection('equipo')} className="nav-link">
            {t('nav.team')}
          </a>
          <a onClick={() => scrollToSection('faq')} className="nav-link">
            {t('nav.faq')}
          </a>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-button login" onClick={closeMenu}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className="nav-button register">
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
          <Link to="/login" className="nav-button login" onClick={closeMenu}>
            <FaSignInAlt style={{ marginRight: '6px' }} />
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