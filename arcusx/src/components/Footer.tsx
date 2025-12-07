import { Link } from 'react-router-dom';
import { FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';
import { SiFarcaster } from 'react-icons/si';
import footerLogo from '../images/arcus-logo.png';
import '../css/Hero.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-section">
            <img src={footerLogo} alt="ArcusX Logo" className="footer-logo" />
            <p>ArcusX es una plataforma freelance descentralizada construida sobre la red Stellar, conectando talento global con oportunidades innovadoras.</p>
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
              <a href="https://warpcast.com/arcusx" target="_blank" rel="noopener noreferrer">
                <SiFarcaster />
              </a>
            </div>
          </div>
          <div className="footer-section">
            <h4>Plataforma</h4>
            <ul>
              <li><a href="https://docs.arcusx.pro/getting-started/quickstart" target="_blank" rel="noopener noreferrer">Cómo Funciona</a></li>
              <li><Link to="/dashboard">Tareas Disponibles</Link></li>
              <li><a href="https://docs.arcusx.pro/getting-started/publish-your-docs" target="_blank" rel="noopener noreferrer">Comisiones</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Recursos</h4>
            <ul>
              <li><a href="https://docs.arcusx.pro/" target="_blank" rel="noopener noreferrer">Guía</a></li>
              <li><a href="https://docs.arcusx.pro/" target="_blank" rel="noopener noreferrer">Tutoriales</a></li>
              <li><a href="https://docs.arcusx.pro/community/faq" target="_blank" rel="noopener noreferrer">FAQ</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><a href="https://docs.arcusx.pro/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Privacidad</a></li>
              <li><a href="https://docs.arcusx.pro/legal/terms-and-conditions" target="_blank" rel="noopener noreferrer">Términos</a></li>
              <li><a href="https://docs.arcusx.pro/legal/security" target="_blank" rel="noopener noreferrer">Seguridad</a></li>
              <li><a href="https://docs.arcusx.pro/legal/compliance" target="_blank" rel="noopener noreferrer">Compliance</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 ArcusX. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

