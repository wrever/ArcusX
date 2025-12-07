import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartLine, FaExclamationTriangle, FaBell, FaGavel, FaUsers, FaSignOutAlt, FaCoins, FaShieldAlt, FaTasks, FaWallet } from 'react-icons/fa';
import AdminStats from './AdminStats';
import NotificationManagement from './NotificationManagement';
import DisputeManagement from './DisputeManagement';
import TaskManagement from './TaskManagement';
import EscrowManagement from './EscrowManagement';
import UserManagement from './UserManagement';
import FeeManagement from './FeeManagement';
import TokenManagement from './TokenManagement';
import { getAdminStats, getAdminConfig, adminLogout } from '../services/adminService';
import '../css/AdminPanel.css';

interface AdminStats {
  totalEscrows: number;
  totalVolume: number;
  totalFees: number;
  activeDisputes: number;
  platformFee: number;
  referralFee: number;
  treasury: string;
  arbitrator: string;
  volumeThisMonth?: number;
  feesThisMonth?: number;
  volumeToday?: number;
  feesToday?: number;
}

interface AdminPanelProps {
  isAdmin: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isAdmin }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar permisos de admin
  useEffect(() => {
    if (!isAdmin) {
      setError('No tienes permisos de administrador');
      setLoading(false);
      return;
    }
    fetchAdminStats();
  }, [isAdmin]);

  const fetchAdminStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener estadísticas del backend
      const backendStats = await getAdminStats();
      
      // Obtener configuración del sistema
      let configs: any[] = [];
      try {
        configs = await getAdminConfig();
      } catch (configError) {
        // Si falla obtener config, usar valores por defecto
        console.warn('No se pudo obtener configuración del sistema, usando valores por defecto');
      }
      
      const platformFeeConfig = configs.find(c => c.config_key === 'platform_fee');
      const referralFeeConfig = configs.find(c => c.config_key === 'referral_fee');
      const treasuryConfig = configs.find(c => c.config_key === 'treasury_address');
      const arbitratorConfig = configs.find(c => c.config_key === 'arbitrator_address');
      
      // Convertir platform_fee de porcentaje (0.3) a número para mostrar (0.3%)
      const platformFeeValue = platformFeeConfig?.config_value;
      const platformFeeDisplay = typeof platformFeeValue === 'number' 
        ? platformFeeValue * 100 
        : (typeof platformFeeValue === 'string' ? parseFloat(platformFeeValue) * 100 : 0.3);
      
      // Obtener disputas activas
      let activeDisputes = 0;
      try {
        const adminService = await import('../services/adminService');
        const disputesData = await adminService.getAdminDisputes({ status: 'pending', limit: 1 });
        activeDisputes = disputesData.pagination?.total || 0;
      } catch (disputeError) {
        // Si falla, dejar en 0
      }
      
      // Calcular estadísticas adicionales (volumen y comisiones del mes y hoy)
      // Nota: Estas estadísticas se pueden calcular en el backend en el futuro
      const volumeThisMonth = backendStats.total_volume_usdc || 0; // TODO: Calcular en backend con filtro de fecha
      const feesThisMonth = backendStats.total_commission_usdc || 0; // TODO: Calcular en backend con filtro de fecha
      const volumeToday = 0; // TODO: Calcular en backend
      const feesToday = 0; // TODO: Calcular en backend
      
      // Mapear datos del backend a la interfaz del frontend
      setStats({
        totalEscrows: backendStats.total_escrows || 0,
        totalVolume: backendStats.total_volume_usdc || 0,
        totalFees: backendStats.total_commission_usdc || 0,
        activeDisputes: activeDisputes,
        platformFee: platformFeeDisplay || 0.3,
        referralFee: referralFeeConfig?.config_value || 0,
        treasury: treasuryConfig?.config_value || '',
        arbitrator: arbitratorConfig?.config_value || '',
        volumeThisMonth: volumeThisMonth,
        feesThisMonth: feesThisMonth,
        volumeToday: volumeToday,
        feesToday: feesToday
      });
    } catch (err: any) {
      console.error('Error al cargar estadísticas:', err);
      setError(err.message || 'Error al cargar estadísticas. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // TABS DISPONIBLES
  const tabs = [
    { id: 'overview', label: 'Resumen', icon: <FaChartLine /> },
    { id: 'users', label: 'Usuarios', icon: <FaUsers /> },
    { id: 'tasks', label: 'Tareas', icon: <FaTasks /> },
    { id: 'escrows', label: 'Escrows', icon: <FaWallet /> },
    { id: 'fees', label: 'Gestión de Fees', icon: <FaCoins /> },
    { id: 'tokens', label: 'Tokens', icon: <FaShieldAlt /> },
    { id: 'notifications', label: 'Notificaciones', icon: <FaBell /> },
    { id: 'disputes', label: 'Arbitraje', icon: <FaGavel /> }
  ];

  if (!isAdmin) {
    return (
      <div className="admin-panel-container">
        <div className="admin-access-denied">
          <FaExclamationTriangle className="access-denied-icon" />
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos de administrador para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel-container">
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel-container">
        <div className="admin-error">
          <FaExclamationTriangle className="error-icon" />
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchAdminStats} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-panel-container">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1>Panel de Administración</h1>
            <p>Gestiona la plataforma ArcusX</p>
          </div>
          <button 
            onClick={handleLogout}
            className="admin-logout-button"
            title="Cerrar sesión"
          >
            <FaSignOutAlt />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="admin-content">
        {activeTab === 'overview' && (
          <AdminStats 
            stats={stats} 
            onRefresh={fetchAdminStats}
            loading={loading}
            onNavigate={setActiveTab}
          />
        )}
        
        {activeTab === 'users' && (
          <UserManagement 
            onUpdate={fetchAdminStats}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskManagement 
            onUpdate={fetchAdminStats}
          />
        )}

        {activeTab === 'escrows' && (
          <EscrowManagement 
            onUpdate={fetchAdminStats}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationManagement 
            onUpdate={fetchAdminStats}
          />
        )}

        {activeTab === 'fees' && (
          <FeeManagement 
            onUpdate={fetchAdminStats}
          />
        )}

        {activeTab === 'tokens' && (
          <TokenManagement 
            onUpdate={fetchAdminStats}
          />
        )}

        {activeTab === 'disputes' && (
          <DisputeManagement 
            onUpdate={fetchAdminStats}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
