import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartLine, FaExclamationTriangle, FaBell, FaGavel, FaUsers, FaSignOutAlt, FaCoins, FaShieldAlt, FaTasks, FaWallet, FaUserPlus, FaHistory } from 'react-icons/fa';
import AdminActivity from './AdminActivity';
import AdminStats from './AdminStats';
import NotificationManagement from './NotificationManagement';
import DisputeManagement from './DisputeManagement';
import TaskManagement from './TaskManagement';
import EscrowManagement from './EscrowManagement';
import UserManagement from './UserManagement';
import FeeManagement from './FeeManagement';
import TokenManagement from './TokenManagement';
import ReferralManagement from './ReferralManagement';
import KycManagement from './KycManagement';
import { getAdminStats, getAdminConfig, getReferralStats, adminLogout } from '../services/adminService';
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
  volumeThisWeek?: number;
  feesThisWeek?: number;
  volumeToday?: number;
  feesToday?: number;
  totalUsers?: number;
  totalReferralUsers?: number;
  volumeTasksUsdc?: number;
  volumeDealsUsdc?: number;
  feesTasksUsdc?: number;
  feesDealsUsdc?: number;
  releasedTransactions?: number;
  taskEscrows?: number;
  dealEscrows?: number;
  totalDeals?: number;
  completedDeals?: number;
  openTasks?: number;
  usersToday?: number;
  usersThisWeek?: number;
  usersThisMonth?: number;
  usersWithWallet?: number;
  tasksToday?: number;
  dataSource?: string;
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
      const [backendStats, referralStats] = await Promise.all([
        getAdminStats(),
        getReferralStats().catch(() => null),
      ]);
      
      // Obtener configuración del sistema
      let configs: any[] = [];
      try {
        configs = await getAdminConfig();
      } catch (configError) {
        // Si falla obtener config, usar valores por defecto
        // Usar valores por defecto si falla obtener config
      }
      
      const platformFeeConfig = configs.find(c => c.config_key === 'platform_fee');
      const referralFeeConfig = configs.find(c => c.config_key === 'referral_fee');
      const treasuryConfig = configs.find(c => c.config_key === 'treasury_address');
      const arbitratorConfig = configs.find(c => c.config_key === 'arbitrator_address');
      
      // platform_fee en BD es decimal (0.037 = 3.7% ArcusX)
      const platformFeeValue = platformFeeConfig?.config_value;
      const platformFeeDisplay = typeof platformFeeValue === 'number' 
        ? platformFeeValue * 100 
        : (typeof platformFeeValue === 'string' ? parseFloat(platformFeeValue) * 100 : 3.7);
      
      const activeDisputes = backendStats.active_disputes ?? backendStats.pending_transactions ?? 0;

      // Usar estadísticas por período del backend (Supabase)
      const volumeToday = backendStats.volume_today || 0;
      const feesToday = backendStats.fees_today || 0;
      const volumeThisWeek = backendStats.volume_this_week || 0;
      const feesThisWeek = backendStats.fees_this_week || 0;
      const volumeThisMonth = backendStats.volume_this_month || 0;
      const feesThisMonth = backendStats.fees_this_month || 0;
      
      // Mapear datos del backend a la interfaz del frontend
      setStats({
        totalEscrows: backendStats.total_escrows || 0,
        totalVolume: backendStats.total_volume_usdc || 0,
        totalFees: backendStats.total_commission_usdc || 0,
        activeDisputes: activeDisputes,
        platformFee: platformFeeDisplay || 3.7,
        referralFee: referralFeeConfig?.config_value || 0,
        treasury: treasuryConfig?.config_value || '',
        arbitrator: arbitratorConfig?.config_value || '',
        volumeThisMonth: volumeThisMonth,
        feesThisMonth: feesThisMonth,
        volumeThisWeek: volumeThisWeek,
        feesThisWeek: feesThisWeek,
        volumeToday: volumeToday,
        feesToday: feesToday,
        totalUsers: backendStats.total_users ?? 0,
        totalReferralUsers: referralStats?.total_valid_referrals ?? 0,
        volumeTasksUsdc: backendStats.volume_tasks_usdc ?? 0,
        volumeDealsUsdc: backendStats.volume_deals_usdc ?? 0,
        feesTasksUsdc: backendStats.fees_tasks_usdc ?? 0,
        feesDealsUsdc: backendStats.fees_deals_usdc ?? 0,
        releasedTransactions: backendStats.released_transactions ?? 0,
        taskEscrows: backendStats.task_escrows ?? 0,
        dealEscrows: backendStats.deal_escrows ?? 0,
        totalDeals: backendStats.total_deals ?? 0,
        completedDeals: backendStats.completed_deals ?? 0,
        openTasks: backendStats.open_tasks ?? 0,
        usersToday: backendStats.users_today ?? 0,
        usersThisWeek: backendStats.users_this_week ?? 0,
        usersThisMonth: backendStats.users_this_month ?? 0,
        usersWithWallet: backendStats.users_with_wallet ?? 0,
        tasksToday: backendStats.tasks_today ?? 0,
        dataSource: backendStats.data_source ?? 'supabase',
      });
    } catch (err: any) {
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
    { id: 'disputes', label: 'Arbitraje', icon: <FaGavel /> },
    { id: 'referrals', label: 'Referidos', icon: <FaUserPlus /> },
    { id: 'kyc', label: 'KYB / KYC', icon: <FaShieldAlt /> },
    { id: 'activity', label: 'Actividad', icon: <FaHistory /> },
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
    navigate('/dashboard');
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

        {activeTab === 'referrals' && (
          <ReferralManagement />
        )}

        {activeTab === 'kyc' && <KycManagement />}

        {activeTab === 'activity' && <AdminActivity />}
      </div>
    </div>
  );
};

export default AdminPanel;
