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
    // Tiempo mínimo de visualización (1.5 segundos)
    const minDisplayTime = 1500;
    const startTime = Date.now();
    
    const handleLoad = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);
      
      setTimeout(() => {
        setLoading(false);
      }, remaining);
    };
    
    // Si ya está cargado, esperar el tiempo mínimo
    if (document.readyState === 'complete') {
      setTimeout(() => {
        setLoading(false);
      }, minDisplayTime);
    } else {
      window.addEventListener('load', handleLoad);
      
      // Timeout máximo de seguridad (2 segundos)
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 2000);
      
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('load', handleLoad);
      };
    }
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