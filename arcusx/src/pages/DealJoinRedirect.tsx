import { Navigate, useParams } from 'react-router-dom';
import { dealJoinDashboardHref } from '../config/dashboardTabs';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';

/** Compat: /deals/join/:token → dashboard pestaña Deals */
const DealJoinRedirect = () => {
  const { token } = useParams<{ token: string }>();
  const enterprise = useEnterpriseMode();
  if (!token?.trim()) return <Navigate to="/dashboard?tab=deals" replace />;
  return <Navigate to={dealJoinDashboardHref(token.trim(), enterprise)} replace />;
};

export default DealJoinRedirect;
