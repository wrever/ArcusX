import React from 'react';
import { FaChartLine, FaCoins, FaUsers, FaExclamationTriangle, FaCheckCircle, FaWallet, FaGavel, FaCog, FaShieldAlt } from 'react-icons/fa';
import '../css/AdminStats.css';

interface AdminStatsProps {
  stats: {
    totalEscrows: number;
    totalVolume: number;
    totalFees: number;
    activeDisputes: number;
    platformFee: number;
    referralFee: number;
    treasury: string;
    arbitrator: string;
  } | null;
  onRefresh: () => void;
  loading: boolean;
}

const AdminStats: React.FC<AdminStatsProps> = ({ stats, onRefresh, loading }) => {
  const formatAddress = (address: string) => {
    if (!address) return 'No configurado';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const statsCards = [
    {
      title: 'Total Escrows',
      value: stats?.totalEscrows || 0,
      icon: <FaChartLine />,
      color: '#28c0f0',
      description: 'Escrows creados'
    },
    {
      title: 'Volumen Total',
      value: formatCurrency(stats?.totalVolume || 0),
      icon: <FaCoins />,
      color: '#10b981',
      description: 'Volumen procesado'
    },
    {
      title: 'Fees Recaudados',
      value: formatCurrency(stats?.totalFees || 0),
      icon: <FaWallet />,
      color: '#f59e0b',
      description: 'Comisiones de plataforma'
    },
    {
      title: 'Disputas Activas',
      value: stats?.activeDisputes || 0,
      icon: <FaExclamationTriangle />,
      color: '#ef4444',
      description: 'Disputas pendientes'
    }
  ];

  const configItems = [
    {
      title: 'Fee de Plataforma',
      value: `${stats?.platformFee || 0}%`,
      icon: <FaCoins />,
      description: 'Porcentaje de comisión de la plataforma'
    },
    {
      title: 'Fee de Referral',
      value: `${stats?.referralFee || 0}%`,
      icon: <FaUsers />,
      description: 'Porcentaje de comisión por referidos'
    },
    {
      title: 'Treasury',
      value: formatAddress(stats?.treasury || ''),
      icon: <FaWallet />,
      description: 'Dirección del treasury'
    },
    {
      title: 'Arbitrador',
      value: formatAddress(stats?.arbitrator || ''),
      icon: <FaGavel />,
      description: 'Dirección del arbitrador'
    }
  ];

  return (
    <div className="admin-stats">
      <div className="stats-header">
        <h2>Resumen del Sistema</h2>
        <button 
          onClick={onRefresh} 
          className="refresh-button"
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <h3>{stat.title}</h3>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-description">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Overview */}
      <div className="config-overview">
        <h3>Configuración Actual</h3>
        <div className="config-grid">
          {configItems.map((item, index) => (
            <div key={index} className="config-item">
              <div className="config-icon">
                {item.icon}
              </div>
              <div className="config-content">
                <h4>{item.title}</h4>
                <p className="config-value">{item.value}</p>
                <p className="config-description">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="system-status">
        <h3>Estado del Sistema</h3>
        <div className="status-items">
          <div className="status-item">
            <FaCheckCircle className="status-icon success" />
            <span>Contrato Activo</span>
          </div>
          <div className="status-item">
            <FaCheckCircle className="status-icon success" />
            <span>API Funcionando</span>
          </div>
          <div className="status-item">
            <FaCheckCircle className="status-icon success" />
            <span>Base de Datos Conectada</span>
          </div>
          <div className="status-item">
            <FaCheckCircle className="status-icon success" />
            <span>Red Sepolia</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Acciones Rápidas</h3>
        <div className="action-buttons">
          <button className="action-button primary">
            <FaCog />
            <span>Configurar Fees</span>
          </button>
          <button className="action-button secondary">
            <FaShieldAlt />
            <span>Gestionar Tokens</span>
          </button>
          <button className="action-button warning">
            <FaExclamationTriangle />
            <span>Ver Disputas</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
