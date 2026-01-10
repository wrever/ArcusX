import React, { useEffect, useState } from 'react';
import '../css/Preloader.css';
import logoDark from '../images/arcus-logo.png';
import logoLight from '../images/arcusxlogoclaro.png';
import { useTheme } from '../contexts/ThemeContext';

const Preloader: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const logo = theme === 'light' ? logoLight : logoDark;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // 2 segundos de carga

    return () => clearTimeout(timer);
  }, []);

  if (!loading) return null;

  return (
    <div 
      className="preloader"
      style={{ background: theme === 'light' ? '#ffffff' : '#07233c' }}
    >
      <div className="preloader-content">
        <div className="logo">
          <img src={logo} alt="ArcusX Logo" className="logo-image" />
        </div>
        <div className="loading-circle">
          <div className="circle"></div>
        </div>
      </div>
    </div>
  );
};

export default Preloader; 