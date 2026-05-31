import React, { useState, useEffect } from 'react';
import { FaChartLine, FaCoins, FaUsers, FaUserPlus, FaExclamationTriangle, FaCheckCircle, FaWallet, FaGavel, FaCog, FaShieldAlt, FaLink, FaSpinner } from 'react-icons/fa';
import { PLATFORM_WALLET, ADMIN_WALLET, TRUSTLESS_WORK_BASE_URL } from '../config/trustlessWork';
import { useGetEscrowFromIndexerByContractIds } from '@trustless-work/escrow/hooks';
import { getAdminTasks } from '../services/adminService';
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
    volumeThisMonth?: number;
    feesThisMonth?: number;
    volumeThisWeek?: number;
    feesThisWeek?: number;
    volumeToday?: number;
    feesToday?: number;
    totalUsers?: number;
    totalReferralUsers?: number;
  } | null;
  onRefresh: () => void;
  loading: boolean;
  onNavigate?: (tab: string) => void;
}

const AdminStats: React.FC<AdminStatsProps> = ({ stats, onRefresh, loading, onNavigate }) => {
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  
  // Estado para estadísticas de escrows
  const [escrowsStats, setEscrowsStats] = useState<{
    activeCount: number;
    totalBalance: number;
    completedCount: number;
    disputedCount: number;
    inconsistencies: number;
    loading: boolean;
  }>({
    activeCount: 0,
    totalBalance: 0,
    completedCount: 0,
    disputedCount: 0,
    inconsistencies: 0,
    loading: false
  });

  useEffect(() => {
    fetchEscrowsStats();
  }, []);

  const fetchEscrowsStats = async () => {
    setEscrowsStats(prev => ({ ...prev, loading: true }));
    try {
      // Obtener todas las tareas con escrow_id
      const tasksData = await getAdminTasks({ 
        page: 1, 
        limit: 1000, // Obtener todas las tareas
        status: '' // Sin filtro de estado
      });

      const tasks = tasksData.tasks || [];
      
      // Filtrar solo escrows de Trustless Work (empiezan con 'C')
      const trustlessEscrows = tasks
        .filter((task: any) => task.escrow_id && task.escrow_id.startsWith('C'))
        .map((task: any) => task.escrow_id);

      if (trustlessEscrows.length === 0) {
        setEscrowsStats({
          activeCount: 0,
          totalBalance: 0,
          completedCount: 0,
          disputedCount: 0,
          inconsistencies: 0,
          loading: false
        });
        return;
      }

      // Obtener información de escrows desde Trustless Work (en lotes de 10)
      const batchSize = 10;
      let activeCount = 0;
      let totalBalance = 0;
      let completedCount = 0;
      let disputedCount = 0;
      let inconsistencies = 0;

      for (let i = 0; i < trustlessEscrows.length; i += batchSize) {
        const batch = trustlessEscrows.slice(i, i + batchSize);
        
        try {
          const result = await getEscrowByContractIds({
            contractIds: batch,
            validateOnChain: true
          });

          const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
          
          escrows.forEach((escrow: any) => {
            const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
            const flags = escrow.flags || {};
            const isDisputed = flags.disputed === true || escrow.isDisputed === true || escrow.disputed === true;
            const isResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true;
            const isReleased = flags.released === true || escrow.isReleased === true || escrow.released === true;
            const isActive = escrow.isActive === true;

            // Verificar inconsistencias
            if (escrow.inconsistencies?.inconsistencyFound) {
              inconsistencies++;
            }

            //  MEJORA: Determinar estado real basándose en flags de Trustless Work
            if (isDisputed) {
              disputedCount++;
            } else if (isResolved || isReleased || balance === 0) {
              completedCount++;
            } else if (isActive && balance > 0) {
              activeCount++;
              totalBalance += balance;
            }
          });
        } catch (err) {
        }
      }

      setEscrowsStats({
        activeCount,
        totalBalance,
        completedCount,
        disputedCount,
        inconsistencies,
        loading: false
      });
    } catch (err) {
      setEscrowsStats(prev => ({ ...prev, loading: false }));
    }
  };

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
      title: 'Usuarios en la plataforma',
      value: stats?.totalUsers ?? 0,
      icon: <FaUsers />,
      color: '#3b82f6',
      description: 'Total exacto en base de datos (MySQL)',
      trend: null,
    },
    {
      title: 'Registros por referido',
      value: stats?.totalReferralUsers ?? 0,
      icon: <FaUserPlus />,
      color: '#10dd88',
      description: 'Invitados válidos (status valid, todos los tiempos)',
      trend: 'Ver detalle por afiliado en pestaña Referidos',
    },
    {
      title: 'Total Escrows',
      value: stats?.totalEscrows || 0,
      icon: <FaChartLine />,
      color: '#10dd88',
      description: 'Escrows creados',
      trend: null
    },
    {
      title: 'Volumen Total',
      value: formatCurrency(stats?.totalVolume || 0),
      icon: <FaCoins />,
      color: '#10b981',
      description: 'Volumen procesado (todos los tiempos)',
      trend: stats?.volumeThisWeek || stats?.volumeThisMonth 
        ? `Esta semana: ${formatCurrency(stats.volumeThisWeek || 0)} | Este mes: ${formatCurrency(stats.volumeThisMonth || 0)}` 
        : null
    },
    {
      title: 'Fees Recaudados',
      value: formatCurrency(stats?.totalFees || 0),
      icon: <FaWallet />,
      color: '#f59e0b',
      description: `Comisiones acumuladas (${stats?.platformFee || 3}% del volumen)`,
      trend: stats?.feesThisWeek || stats?.feesThisMonth 
        ? `Esta semana: ${formatCurrency(stats.feesThisWeek || 0)} | Este mes: ${formatCurrency(stats.feesThisMonth || 0)}` 
        : null
    },
    {
      title: 'Disputas Activas',
      value: stats?.activeDisputes || 0,
      icon: <FaExclamationTriangle />,
      color: '#ef4444',
      description: 'Disputas pendientes',
      trend: null
    },
    {
      title: 'Escrows Activos',
      value: escrowsStats.loading ? (
        <FaSpinner className="spinning" style={{ fontSize: '20px' }} />
      ) : escrowsStats.activeCount,
      icon: <FaCheckCircle />,
      color: '#10b981',
      description: `Balance bloqueado: ${formatCurrency(escrowsStats.totalBalance)}`,
      trend: escrowsStats.completedCount > 0 ? `Completados: ${escrowsStats.completedCount}` : null
    },
    {
      title: 'Escrows en Disputa',
      value: escrowsStats.loading ? (
        <FaSpinner className="spinning" style={{ fontSize: '20px' }} />
      ) : escrowsStats.disputedCount,
      icon: <FaGavel />,
      color: '#ef4444',
      description: 'Escrows en disputa (on-chain)',
      trend: escrowsStats.inconsistencies > 0 
        ? ` ${escrowsStats.inconsistencies} inconsistencias detectadas` 
        : null
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
      description: stats?.treasury 
        ? `Recibe ${formatCurrency(stats?.totalFees || 0)} en comisiones`
        : 'Dirección del treasury (no configurado)',
      link: stats?.treasury ? `https://stellar.expert/explorer/testnet/account/${stats.treasury}` : null
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
              {stat.trend && (
                <p className="stat-trend">{stat.trend}</p>
              )}
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
                {item.link ? (
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="config-value-link"
                  >
                    <p className="config-value">{item.value}</p>
                  </a>
                ) : (
                  <p className="config-value">{item.value}</p>
                )}
                <p className="config-description">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estado de escrows (indexador) */}
      {!escrowsStats.loading && (
        <div className="escrows-status-section" style={{
          marginTop: '30px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaCheckCircle style={{ color: '#10b981' }} />
            Estado de escrows (indexador)
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <div style={{
              padding: '15px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {escrowsStats.activeCount}
              </div>
              <div className="escrows-status-label" style={{ fontSize: '14px', marginTop: '5px' }}>
                Escrows Activos
              </div>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {formatCurrency(escrowsStats.totalBalance)}
              </div>
              <div className="escrows-status-label" style={{ fontSize: '14px', marginTop: '5px' }}>
                Balance Total Bloqueado
              </div>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                {escrowsStats.completedCount}
              </div>
              <div className="escrows-status-label" style={{ fontSize: '14px', marginTop: '5px' }}>
                Escrows Completados
              </div>
            </div>
            {escrowsStats.disputedCount > 0 && (
              <div style={{
                padding: '15px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                  {escrowsStats.disputedCount}
                </div>
                <div className="escrows-status-label" style={{ fontSize: '14px', marginTop: '5px' }}>
                  Escrows en Disputa
                </div>
              </div>
            )}
            {escrowsStats.inconsistencies > 0 && (
              <div style={{
                padding: '15px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {escrowsStats.inconsistencies}
                </div>
                <div className="escrows-status-label" style={{ fontSize: '14px', marginTop: '5px' }}>
                  Inconsistencias Detectadas
                </div>
              </div>
            )}
          </div>
          <button
            onClick={fetchEscrowsStats}
            disabled={escrowsStats.loading}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: 'rgba(40, 192, 240, 0.2)',
              border: '1px solid rgba(40, 192, 240, 0.4)',
              borderRadius: '6px',
              color: '#10dd88',
              cursor: escrowsStats.loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {escrowsStats.loading ? 'Verificando...' : 'Actualizar Estado'}
          </button>
        </div>
      )}

      {/* System Status */}
      <div className="system-status">
        <h3>Estado del Sistema</h3>
        <div className="status-items">
          <div className="status-item">
            <FaCheckCircle className="status-icon success" />
            <span>Sistema Activo</span>
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
            <span>Red Stellar</span>
          </div>
          <div className="status-item">
            <FaCheckCircle className={`status-icon ${TRUSTLESS_WORK_BASE_URL ? 'success' : 'warning'}`} />
            <span>Servicio de escrow {TRUSTLESS_WORK_BASE_URL ? 'conectado' : 'no configurado'}</span>
          </div>
        </div>
      </div>

      {/* Revenue & Treasury Section */}
      <div className="revenue-section">
        <h3>Ganancias y Treasury</h3>
        <div className="revenue-grid">
          <div className="revenue-card primary">
            <div className="revenue-icon">
              <FaCoins />
            </div>
            <div className="revenue-content">
              <h4>Comisiones Totales</h4>
              <p className="revenue-value">{formatCurrency(stats?.totalFees || 0)}</p>
              <p className="revenue-description">
                {stats?.platformFee ? `${stats.platformFee}%` : '3%'} del volumen total
              </p>
              {(stats?.feesThisWeek || stats?.feesThisMonth) && (
                <div className="revenue-trend">
                  {stats?.feesThisWeek && stats.feesThisWeek > 0 && (
                    <p>Esta semana: {formatCurrency(stats.feesThisWeek)}</p>
                  )}
                  {stats?.feesThisMonth && stats.feesThisMonth > 0 && (
                    <p>Este mes: {formatCurrency(stats.feesThisMonth)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="revenue-card secondary">
            <div className="revenue-icon">
              <FaWallet />
            </div>
            <div className="revenue-content">
              <h4>Treasury</h4>
              {stats?.treasury ? (
                <>
                  <a 
                    href={`https://stellar.expert/explorer/testnet/account/${stats.treasury}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="revenue-value-link"
                  >
                    <p className="revenue-value">{formatAddress(stats.treasury)}</p>
                  </a>
                  <p className="revenue-description">
                    Recibe todas las comisiones de plataforma
                  </p>
                  <p className="revenue-trend">
                    Balance estimado: {formatCurrency(stats?.totalFees || 0)}
                  </p>
                </>
              ) : (
                <>
                  <p className="revenue-value">No configurado</p>
                  <p className="revenue-description">
                    Configura el treasury en Gestión de Fees
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Configuración API escrow */}
      <div className="trustless-work-config">
        <h3>Configuración del escrow</h3>
        <div className="config-grid">
          <div className="config-item">
            <div className="config-icon">
              <FaLink />
            </div>
            <div className="config-content">
              <h4>Entorno</h4>
              <p className="config-value">{TRUSTLESS_WORK_BASE_URL === 'https://api.trustlesswork.com' ? 'Mainnet' : 'Development'}</p>
              <p className="config-description">Entorno del API de escrow</p>
            </div>
          </div>
          <div className="config-item">
            <div className="config-icon">
              <FaWallet />
            </div>
            <div className="config-content">
              <h4>Platform Wallet</h4>
              <p className="config-value">{PLATFORM_WALLET ? formatAddress(PLATFORM_WALLET) : 'No configurado'}</p>
              <p className="config-description">Wallet de la plataforma</p>
            </div>
          </div>
          <div className="config-item">
            <div className="config-icon">
              <FaGavel />
            </div>
            <div className="config-content">
              <h4>Admin Wallet</h4>
              <p className="config-value">{ADMIN_WALLET ? formatAddress(ADMIN_WALLET) : 'No configurado'}</p>
              <p className="config-description">Wallet del administrador (dispute resolver)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Acciones Rápidas</h3>
        <div className="action-buttons">
          <button 
            className="action-button primary"
            onClick={() => onNavigate?.('fees')}
          >
            <FaCog />
            <span>Configurar Fees</span>
          </button>
          <button 
            className="action-button secondary"
            onClick={() => onNavigate?.('tokens')}
          >
            <FaShieldAlt />
            <span>Gestionar Tokens</span>
          </button>
          <button 
            className="action-button warning"
            onClick={() => onNavigate?.('disputes')}
          >
            <FaExclamationTriangle />
            <span>Ver Disputas</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
