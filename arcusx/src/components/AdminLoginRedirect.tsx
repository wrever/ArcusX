import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { isAdminLoggedIn } from '../services/adminService';

/** Login admin por formulario deprecado: OAuth en /login + botón en dashboard. */
const AdminLoginRedirect = () => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (isAdminLoggedIn()) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export default AdminLoginRedirect;
