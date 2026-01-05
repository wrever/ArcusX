import { FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';
import '../css/DashboardFooter.css';

const DashboardFooter = () => {
  return (
    <footer className="dashboard-footer">
      <div className="dashboard-footer-content">
        <div className="dashboard-footer-social">
          <a href="https://instagram.com/arcusx_/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <FaInstagram />
          </a>
          <a href="https://twitter.com/ArcusX_one" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <FaTwitter />
          </a>
          <a href="https://www.linkedin.com/in/arcus-x-000348342/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <FaLinkedin />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;

