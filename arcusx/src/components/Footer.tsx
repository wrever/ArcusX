import { Link } from 'react-router-dom';
import { FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';
import footerLogoDark from '../images/arcus-logo.png';
import footerLogoLight from '../images/arcusxlogoclaro.png';
import '../css/Hero.css';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n/I18nProvider';
import { DOCS_SITE_URL } from '../config/docsSite';

const Footer = () => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const footerLogo = theme === 'light' ? footerLogoLight : footerLogoDark;

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-section">
            <img src={footerLogo} alt="ArcusX Logo" className="footer-logo" />
            <p>{t('footer.tagline')}</p>
            <div className="footer-social">
              <a href="https://instagram.com/arcusx_/" target="_blank" rel="noopener noreferrer">
                <FaInstagram />
              </a>
              <a href="https://twitter.com/ArcusX_one" target="_blank" rel="noopener noreferrer">
                <FaTwitter />
              </a>
              <a href="https://www.linkedin.com/in/arcus-x-000348342/" target="_blank" rel="noopener noreferrer">
                <FaLinkedin />
              </a>
            </div>
          </div>
          <div className="footer-section">
            <h4>{t('footer.section.platform')}</h4>
            <ul>
              <li>
                <a href={`${DOCS_SITE_URL}/developers`} target="_blank" rel="noopener noreferrer">
                  {t('footer.link.howItWorks')}
                </a>
              </li>
              <li>
                <Link to="/dashboard">{t('footer.link.availableTasks')}</Link>
              </li>
              <li>
                <a href={`${DOCS_SITE_URL}/developers/escrow`} target="_blank" rel="noopener noreferrer">
                  {t('footer.link.fees')}
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>{t('footer.section.resources')}</h4>
            <ul>
              <li>
                <a href={`${DOCS_SITE_URL}/developers/quickstart`} target="_blank" rel="noopener noreferrer">
                  {t('footer.link.guide')}
                </a>
              </li>
              <li>
                <Link to="/tutoriales">{t('footer.link.tutorials')}</Link>
              </li>
              <li>
                <a href={`${DOCS_SITE_URL}/faq`} target="_blank" rel="noopener noreferrer">
                  {t('footer.link.faq')}
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>{t('footer.section.legal')}</h4>
            <ul>
              <li>
                <a href={`${DOCS_SITE_URL}/legal/privacy`} target="_blank" rel="noopener noreferrer">
                  {t('footer.link.privacy')}
                </a>
              </li>
              <li>
                <a href={`${DOCS_SITE_URL}/legal/terms`} target="_blank" rel="noopener noreferrer">
                  {t('footer.link.terms')}
                </a>
              </li>
              <li>
                <a href={`${DOCS_SITE_URL}/legal/security`} target="_blank" rel="noopener noreferrer">
                  {t('footer.link.security')}
                </a>
              </li>
              <li>
                <a href={`${DOCS_SITE_URL}/legal/compliance`} target="_blank" rel="noopener noreferrer">
                  {t('footer.link.compliance')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
