import { Navigate } from 'react-router-dom';
import { isAdminLoggedIn } from '../services/adminService';
import { authService } from '../services/authService';
import { isPlatformAdmin } from '../utils/platformAdmin';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminLoggedIn()) {
    return <Navigate to="/dashboard" replace />;
  }

  const user = authService.getUser();
  if (!isPlatformAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

