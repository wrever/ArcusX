import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  captureRefFromSearch,
  storeRefCode,
  buildLoginPathWithRef,
  refCodeFromPathname,
  hardRedirectToLoginWithRef,
} from '../utils/referralCapture';

/**
 * Captura ?ref= y /ref/CODE en cualquier ruta.
 * En Safari iOS usamos location.replace para rutas de entrada.
 */
const ReferralBootstrap = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '') || '/';

    const fromPath = refCodeFromPathname(path);
    if (fromPath) {
      storeRefCode(fromPath);
      if (path.startsWith('/ref/') || path.startsWith('/r/')) {
        hardRedirectToLoginWithRef(fromPath);
        return;
      }
    }

    const fromQuery = captureRefFromSearch(location.search);
    if (!fromQuery) return;

    if (path === '/' || path === '/register') {
      const loginPath = buildLoginPathWithRef(fromQuery);
      if (typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.location.replace(`${window.location.origin}${loginPath}`);
      } else {
        navigate(loginPath, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);

  return null;
};

export default ReferralBootstrap;
