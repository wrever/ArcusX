import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaTasks, FaWallet, FaChartLine, FaBell, FaCog, FaSignOutAlt, FaPlus, FaTimes, FaExclamationTriangle, FaUsers, FaCheckCircle, FaGlobe, FaLock, FaStar, FaGraduationCap, FaExchangeAlt, FaQuestionCircle } from 'react-icons/fa';
import { MdTranslate } from 'react-icons/md';
import ThemeToggle from './components/ThemeToggle';
import { FiMenu } from 'react-icons/fi';
import './css/dashboard.css';
import arcusLogoDark from './images/arcus-logo.png';
import arcusLogoLight from './images/arcusxlogoclaro.png';
import axios from 'axios';
import { API_URL } from './config/database';
import { useAuth } from './hooks/useAuth';
import WalletButton from './components/WalletButton';
import { useScheduledTaskDeletion } from './hooks/useScheduledTaskDeletion';
import DashboardFooter from './components/DashboardFooter';
// import PendingNotificationsPopup from './components/PendingNotificationsPopup'; // Popup eliminado
import { getUserNotifications, Notification, markNotificationAsRead as markNotificationAsReadService } from './services/notificationService';
import { getUserDisputes, UserDispute } from './services/disputeService';
import { getUserTransactions, getUserEarningsSummary, Transaction } from './services/transactionService';
import { getUserProfile, getUserPublicStats } from './services/profileService';
import type { UserProfile as UserProfileType, UserStatistics } from './types/profile';
import RatingDisplay from './components/RatingDisplay';
import { getUserRatingSummary } from './services/ratingService';
import { useI18n } from './i18n/I18nProvider';
import { useDebounce } from './hooks/useDebounce';
import FreelancersList from './components/FreelancersList';
import TutorialsTab from './components/TutorialsTab';
import SwapPage from './pages/SwapPage';
import SupportPage from './pages/SupportPage';
import { getAvatarUrl } from './utils/avatarUtils';
import { useTheme } from './contexts/ThemeContext';

interface UserData {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  // Agrega otros campos del usuario si existen en tu objeto de usuario
}

interface TaskData {
  id: number;
  title: string;
  description: string;
  price: string;
  currency: string;
  difficulty: string;
  category: string;
  creator_username: string; // Nombre del usuario que creó la tarea
  creator_id?: number; // ID del creador
  creator_rating?: number; // Rating promedio del creador
  creator_total_ratings?: number; // Total de ratings del creador
  created_at: string;
  subtitle: string;
  status: string; // Añadir el estado de la tarea
  proposal_count?: number; // Añadir campo para el conteo de propuestas (opcional inicialmente)
  has_accepted_proposal?: boolean; // **Añadido de nuevo**
  accepted_applicant_id?: number | null; // **Añadido de nuevo**
}

const Dashboard = () => {
  const { t, toggle, lang } = useI18n();
  const { theme } = useTheme();
  const arcusLogo = theme === 'light' ? arcusLogoLight : arcusLogoDark;
  const [activeTab, setActiveTab] = useState('tasks');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce de 500ms
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [fetchedTasks, setFetchedTasks] = useState<TaskData[]>([]); // Estado para las tareas de la API
  const [loadingTasks, setLoadingTasks] = useState(true); // Estado de carga para las tareas
  const [tasksError, setTasksError] = useState<string>(''); // Estado de error al cargar tareas
  
  // Nuevo estado para las tareas del usuario
  const [userTasks, setUserTasks] = useState<TaskData[]>([]);
  const [loadingUserTasks, setLoadingUserTasks] = useState(true);
  const [userTasksError, setUserTasksError] = useState<string>('');
  
  // Nuevo estado para las tareas aceptadas por el usuario
  const [acceptedTasks, setAcceptedTasks] = useState<TaskData[]>([]);
  const [loadingAcceptedTasks, setLoadingAcceptedTasks] = useState(true);
  const [acceptedTasksError, setAcceptedTasksError] = useState<string>('');
  
  // Nuevo estado para tareas completadas
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);
  
  
  
  // Estado para notificaciones
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  
  // Estado para disputas
  const [pendingDisputes, setPendingDisputes] = useState<UserDispute[]>([]);
  
  // Verificar y eliminar tareas programadas automáticamente
  useScheduledTaskDeletion();
  
  // Obtener usuario logeado desde localStorage
  const storedUser = localStorage.getItem('user');
  const storedUserData: UserData | null = storedUser ? JSON.parse(storedUser) : null;
  const [name] = useState<string>(storedUserData?.username || '');
  const [email] = useState<string>(storedUserData?.email || '');
  
  // Estado para avatar del usuario (para mostrar en sidebar)
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(
    storedUserData?.avatar_url || null
  );
  
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  // Estado para transacciones reales
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string>('');
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  
  // Estado para perfil de usuario
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  
  // Actualizar avatar cuando se carga el perfil
  useEffect(() => {
    if (userProfile?.avatar_url) {
      setUserAvatarUrl(userProfile.avatar_url);
    } else if (storedUserData?.avatar_url) {
      setUserAvatarUrl(storedUserData.avatar_url);
    }
  }, [userProfile?.avatar_url, storedUserData?.avatar_url]);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  
  // Estado para rating del usuario (para mostrar en sidebar)
  const [userRating, setUserRating] = useState<{ average_rating: number; total_ratings: number } | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);
  
  // Las tareas ya vienen filtradas del backend, solo excluir asignadas
  const filteredTasks = fetchedTasks.filter(task => task.status !== 'assigned');
  
  // --- Lógica para obtener ganancias totales al cargar el dashboard --- //
  useEffect(() => {
    if (user?.id) {
      const fetchEarnings = async () => {
        try {
          const earningsData = await getUserEarningsSummary(user.id);
          if (earningsData.success) {
            setTotalEarnings(parseFloat(earningsData.total_earned));
            setTotalPaid(parseFloat(earningsData.total_paid));
          }
        } catch (error: any) {
        }
      };
      
      fetchEarnings();
    }
  }, [user?.id]); // Cargar ganancias cuando el usuario esté disponible

  // --- Lógica para obtener transacciones cuando se activa la pestaña wallet --- //
  useEffect(() => {
    if (activeTab === 'wallet' && user?.id) {
      const fetchTransactions = async () => {
        setLoadingTransactions(true);
        setTransactionsError('');
        try {
          const [transactionsData, earningsData] = await Promise.all([
            getUserTransactions(user.id, transactionsPage, 20),
            getUserEarningsSummary(user.id)
          ]);
          
          if (transactionsData.success) {
            setTransactions(transactionsData.transactions);
            setTransactionsTotalPages(transactionsData.pagination.total_pages);
          }
          
          if (earningsData.success) {
            setTotalEarnings(parseFloat(earningsData.total_earned));
            setTotalPaid(parseFloat(earningsData.total_paid));
          }
        } catch (error: any) {
          setTransactionsError(error.message || 'Error al cargar transacciones');
          setTransactions([]);
        } finally {
          setLoadingTransactions(false);
        }
      };
      
      fetchTransactions();
    }
  }, [activeTab, user?.id, transactionsPage]);
  
  // --- Lógica para obtener tareas desde la API --- //
  useEffect(() => {
    if (activeTab === 'tasks') { // Cargar tareas solo cuando la pestaña 'tasks' está activa
      const fetchTasks = async () => {
        setLoadingTasks(true);
        setTasksError('');
        try {
          // Construir query params con todos los filtros
          const params = new URLSearchParams();
          if (debouncedSearchQuery.trim()) {
            params.append('search', debouncedSearchQuery.trim());
          }
          if (minPrice && parseFloat(minPrice) > 0) {
            params.append('min_price', minPrice);
          }
          if (maxPrice && parseFloat(maxPrice) > 0) {
            params.append('max_price', maxPrice);
          }
          if (categoryFilter && categoryFilter !== 'all') {
            params.append('category', categoryFilter);
          }
          if (difficultyFilter && difficultyFilter !== 'all') {
            params.append('difficulty', difficultyFilter);
          }
          if (sortBy) {
            params.append('sort_by', sortBy);
          }

          const url = `${API_URL}/auth/get_tasks.php${params.toString() ? '?' + params.toString() : ''}`;
          const response = await axios.get(url);
          
          if (Array.isArray(response.data)) {
            setFetchedTasks(response.data); // Guardar las tareas en el estado
          } else {
            setTasksError('Formato de datos de tareas inesperado.');
            setFetchedTasks([]); // Limpiar tareas si el formato es incorrecto
          }
        } catch (error: any) {
          setTasksError('Error al cargar las tareas: ' + (error.response?.data?.message || error.message));
          setFetchedTasks([]);
        } finally {
          setLoadingTasks(false);
        }
      };

      fetchTasks();
    }
  }, [activeTab, debouncedSearchQuery, minPrice, maxPrice, categoryFilter, difficultyFilter, sortBy]); // Ejecutar cuando cambien los filtros (usando debouncedSearchQuery)
  // -------------------------------------------- //

  // --- Lógica para obtener el rating del usuario para mostrar en el sidebar --- //
  useEffect(() => {
    if (user?.id) {
      const fetchUserRating = async () => {
        setLoadingRating(true);
        try {
          const ratingData = await getUserRatingSummary(user.id);
          setUserRating({
            average_rating: ratingData.average_rating || 0,
            total_ratings: ratingData.total_ratings || 0
          });
        } catch (error: any) {
          // Si falla, establecer valores por defecto
          setUserRating({
            average_rating: 0,
            total_ratings: 0
          });
        } finally {
          setLoadingRating(false);
        }
      };
      
      fetchUserRating();
    }
  }, [user?.id]);
  // -------------------------------------------- //

  // --- Lógica para obtener el conteo de tareas completadas desde la API --- //
  useEffect(() => {
    if (user?.id) { // Solo cargar si el usuario está logeado
      const fetchCompletedTasksCount = async () => {
        try {
          const token = localStorage.getItem('token'); // Asume que el token se guarda aquí
          if (!token) {
            return;
          }

          const response = await axios.get(`${API_URL}/auth/get_completed_tasks_count.php`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data && response.data.success) {
            setCompletedTasksCount(response.data.completed_tasks_count);
          }
        } catch (error: any) {
        }
      };

      fetchCompletedTasksCount();
    }
  }, [user?.id]); // Ejecutar este efecto cuando el user.id cambie (es decir, al logearse)
  // -------------------------------------------- //

  // --- Lógica para obtener tareas del usuario desde la API --- //
  useEffect(() => {
    if (activeTab === 'manage-tasks' && user?.id) { // Cargar tareas del usuario solo cuando la pestaña 'manage-tasks' está activa y el usuario está logeado
      const fetchUserTasks = async () => {
        setLoadingUserTasks(true);
        setUserTasksError('');
        try {
          const response = await axios.get(`${API_URL}/auth/get_user_tasks.php?user_id=${user.id}`);
          if (Array.isArray(response.data)) {
            setUserTasks(response.data); // Guardar las tareas del usuario en el estado
          } else {
            setUserTasksError('Formato de datos de tareas del usuario inesperado.');
            setUserTasks([]); // Limpiar tareas si el formato es incorrecto
          }
        } catch (error: any) {
          setUserTasksError('Error al cargar las tareas del usuario: ' + (error.response?.data?.message || error.message));
          setUserTasks([]);
        } finally {
          setLoadingUserTasks(false);
        }
      };

      fetchUserTasks();
    }
  }, [activeTab, user?.id]);


  // --- Lógica para obtener tareas aceptadas por el usuario desde la API --- //
  useEffect(() => {
    if (activeTab === 'in-progress' && user?.id) { // Cargar tareas aceptadas solo cuando la pestaña 'in-progress' está activa y el usuario está logeado
      const fetchAcceptedTasks = async () => {
        setLoadingAcceptedTasks(true);
        setAcceptedTasksError('');
        try {
          // Llamada al nuevo script de backend
          const response = await axios.get(`${API_URL}/auth/get_accepted_tasks.php?user_id=${user.id}`);
          if (Array.isArray(response.data)) {
            setAcceptedTasks(response.data); // Guardar las tareas aceptadas en el estado
          } else {
            setAcceptedTasksError('Formato de datos de tareas aceptadas inesperado.');
            setAcceptedTasks([]); // Limpiar tareas si el formato es incorrecto
          }
        } catch (error: any) {
          setAcceptedTasksError('Error al cargar las tareas aceptadas: ' + (error.response?.data?.message || error.message));
          setAcceptedTasks([]);
        } finally {
          setLoadingAcceptedTasks(false);
        }
      };

      fetchAcceptedTasks();
    }
  }, [activeTab, user?.id]); // Ejecutar este efecto cuando cambie la pestaña activa o el user.id
  // -------------------------------------------- //

  // --- Lógica para obtener perfil del usuario al cargar el dashboard --- //
  const profileLoadedRef = useRef(false);
  useEffect(() => {
    if (user?.id && !profileLoadedRef.current) {
      profileLoadedRef.current = true;
      const fetchUserProfile = async () => {
        setLoadingProfile(true);
        try {
          const profileData = await getUserProfile(user.id);
          setUserProfile(profileData);
        } catch (error: any) {
          // Si falla, usar datos básicos del localStorage
          const stored = localStorage.getItem('user');
          if (stored) {
            const parsed = JSON.parse(stored);
            setUserProfile({
              id: parsed.id,
              username: parsed.username,
              email: parsed.email,
              avatar_url: parsed.avatar_url || undefined,
              bio: undefined,
              portfolio_url: undefined,
              verified: false,
              public_profile: true,
              member_since: parsed.created_at || new Date().toISOString(),
              skills: [],
              portfolio: [],
              statistics: {
                tasks_completed: 0,
                tasks_created: 0,
                total_earned: 0,
                total_spent: 0,
                average_rating: 0,
                total_ratings: 0,
                completion_rate: 0,
                response_time_avg: undefined
              }
            });
          }
        } finally {
          setLoadingProfile(false);
        }
      };

      fetchUserProfile();
    }
  }, [user?.id]); // Cargar al inicio cuando el usuario esté disponible

  // --- Lógica para obtener estadísticas del usuario cuando se activa la pestaña settings --- //
  useEffect(() => {
    if (activeTab === 'settings' && user?.id) {
      const fetchUserStats = async () => {
        try {
          const statsData = await getUserPublicStats(user.id);
          setUserStats(statsData);
        } catch (error: any) {
          // Si falla, no hacer nada (ya tenemos el perfil básico)
        }
      };

      fetchUserStats();
    }
  }, [activeTab, user?.id]);
  // -------------------------------------------- //
  
  // Función para navegar a la página de creación de tarea
  const handleCreateTaskClick = () => {
    navigate('/create-task');
  };

  // Función para navegar a la página de aplicación de tarea
  const handleApplyTaskClick = (taskId: number) => {
    navigate(`/apply-task/${taskId}`);
  };
  
  // Función para navegar a la página de supervisión (nueva)
  const handleSuperviseTaskClick = (taskId: number, acceptedApplicantId: number | null | undefined) => {
      // TODO: Define la ruta correcta a tu página de supervisión/comunicación
      // Asegúrate de pasar ambos IDs: el de la tarea y el del aplicante aceptado
      if (acceptedApplicantId) {
           navigate(`/supervise-task/${taskId}/${acceptedApplicantId}`);
      } else {
           // Manejar el caso (poco probable si has_accepted_proposal es true) donde no hay ID de aplicante aceptado
           // Opcional: Mostrar un mensaje al usuario
           // alert('No se pudo encontrar al trabajador asignado para esta tarea.');
      }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      // Forzar recarga completa para limpiar todo el estado
      window.location.href = '/';
    } catch (error) {
      // Aún así redirigir
      window.location.href = '/';
    }
  };
  
  // Cargar disputas pendientes
  const fetchPendingDisputes = async () => {
    if (!user?.id) return;
    
    try {
      const data = await getUserDisputes();
      setPendingDisputes(data.disputes);
    } catch (error: any) {
    }
  };
  
  // Nota: La funcionalidad de firmar transacciones de disputa ha sido eliminada.
  // Las disputas ahora se resuelven automáticamente a través de Trustless Work
  // en el panel de administración (DisputeManagement.tsx).
  
  // Cargar notificaciones del usuario
  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setLoadingNotifications(true);
    try {
      const data = await getUserNotifications({ page: 1, limit: 50 });
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (error: any) {
      // Si falla, mantener notificaciones vacías
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Cargar notificaciones y disputas al montar el componente y cuando cambie el usuario
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      fetchPendingDisputes();
      
      // Actualizar notificaciones y disputas cada 30 segundos
      const interval = setInterval(() => {
        fetchNotifications();
        fetchPendingDisputes();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Funciones para manejar notificaciones
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      // Llamar al servicio para persistir en el backend
      await markNotificationAsReadService(notificationId);
      
      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      // Actualizar contador
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      // Aún así actualizar el estado local para mejor UX
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };
  
  const markAllNotificationsAsRead = async () => {
    try {
      // Marcar todas las notificaciones no leídas como leídas
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(notification => 
          markNotificationAsReadService(notification.id).catch(() => {
          })
        )
      );
      
      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error: any) {
      // Aún así actualizar el estado local para mejor UX
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    }
  };
  
  const deleteNotification = (notificationId: number) => {
    const notification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
    // Si era no leída, reducir contador
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle aria-hidden="true" />;
      case 'warning':
        return <FaExclamationTriangle aria-hidden="true" />;
      case 'error':
        return <FaTimes aria-hidden="true" />;
      case 'info':
        return <FaBell aria-hidden="true" />;
      default:
        return <FaBell aria-hidden="true" />;
    }
  };
  
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'info':
        return 'var(--primary-green, #10dd88)';
      default:
        return '#6b7280';
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };
  
  const filteredNotifications = notifications.filter(notification => {
    if (notificationFilter === 'all') return true;
    if (notificationFilter === 'unread') return !notification.is_read;
    return notification.type === notificationFilter;
  });
  
  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
    };

    if (showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationDropdown]);
  
  // Obtener las últimas notificaciones para el dropdown (máximo 5)
  const recentNotifications = notifications
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  
  const userData = {
    name: name,
    level: 0,
    experience: 75,
    tasksCompleted: completedTasksCount,
    tasksAvailable: 60,
    notifications: unreadCount,
    totalEarnings: 0
  };
  
  // Estadísticas de ejemplo
  const stats = [
    { id: 1, title: t('dashboard.stats.completed'), value: userData.tasksCompleted, icon: <FaTasks /> },
    { id: 2, title: t('dashboard.stats.available'), value: filteredTasks.length, icon: <FaTasks /> },
    { id: 3, title: t('dashboard.stats.earnings'), value: `$${totalEarnings.toFixed(2)}`, icon: <FaWallet /> },
    { id: 4, title: t('dashboard.stats.level'), value: userData.level, icon: <FaChartLine /> }
  ];
  
  return (
    <div className="dashboard">
      <div className="dashboard-wrapper">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <img src={arcusLogo} alt="Arcus" />
          </Link>
        </div>
        
        <div className="sidebar-user">
          <Link 
            to={`/profile/${user?.id || storedUserData?.id || ''}`} 
            className="user-avatar-link"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            <div className="user-avatar">
              {userAvatarUrl || userProfile?.avatar_url ? (
                <img 
                  src={getAvatarUrl(userAvatarUrl || userProfile?.avatar_url || '')} 
                  alt={userData.name}
                  className="user-avatar-image"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // Si la imagen falla, ocultar y mostrar placeholder
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const placeholder = parent.querySelector('.user-avatar-placeholder');
                      if (placeholder) {
                        (placeholder as HTMLElement).style.display = 'flex';
                      }
                    }
                  }}
                />
              ) : null}
              {(!userAvatarUrl && !userProfile?.avatar_url) && (
                <div className="user-avatar-placeholder">
                  {userData.name
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
            </div>
          </Link>
          <div className="user-info">
            <Link 
              to={`/profile/${user?.id || storedUserData?.id || ''}`} 
              className="user-dashboard-link"
              style={{ textDecoration: 'none' }}
            >
              <h3 className="user-name-display">
                {userData.name}
              </h3>
            </Link>
            <Link 
              to={`/profile/${user?.id || storedUserData?.id || ''}`} 
              className="user-rating-link"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div className="user-level">
                {loadingRating ? (
                  <span style={{ color: '#888', fontSize: '0.9rem' }}>...</span>
                ) : (
                  <RatingDisplay
                    averageRating={userRating?.average_rating || 0}
                    totalRatings={userRating?.total_ratings || 0}
                    size="small"
                  />
                )}
              </div>
            </Link>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')}>
              <FaTasks /> <span>{t('dashboard.tabs.tasks')}</span>
            </li>
            <li className={activeTab === 'in-progress' ? 'active' : ''} onClick={() => setActiveTab('in-progress')}>
              <FaTasks /> <span>{t('dashboard.tabs.in.progress')}</span>
            </li>
             <li className={activeTab === 'manage-tasks' ? 'active' : ''} onClick={() => setActiveTab('manage-tasks')}>
              <FaTasks />
              <span>{t('dashboard.tabs.manage.tasks')}</span>
            </li>
            <li className={activeTab === 'freelancers' ? 'active' : ''} onClick={() => setActiveTab('freelancers')}>
              <FaUsers /> <span>{t('dashboard.tabs.freelancers')}</span>
            </li>
            <li className={activeTab === 'wallet' ? 'active' : ''} onClick={() => setActiveTab('wallet')}>
              <FaWallet /> <span>{t('dashboard.tabs.wallet')}</span>
            </li>
            <li className={activeTab === 'swap' ? 'active' : ''} onClick={() => setActiveTab('swap')}>
              <FaExchangeAlt /> <span>{t('dashboard.tabs.swap')}</span>
            </li>
            <li className={activeTab === 'tutorials' ? 'active' : ''} onClick={() => setActiveTab('tutorials')}>
              <FaGraduationCap /> <span>{t('dashboard.tabs.tutorials')}</span>
            </li>
            <li className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')}>
              <FaBell /> <span>{t('dashboard.tabs.notifications')}</span>
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </li>
            <li className={activeTab === 'support' ? 'active' : ''} onClick={() => setActiveTab('support')}>
              <FaQuestionCircle /> <span>{t('dashboard.tabs.support')}</span>
            </li>
            <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
              <FaCog /> <span>{t('dashboard.tabs.settings')}</span>
            </li>
           
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> <span>{t('dashboard.logout')}</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <h1>
            {activeTab === 'tasks' && t('dashboard.title.tasks')}
            {activeTab === 'wallet' && t('dashboard.title.wallet')}
            {activeTab === 'notifications' && t('dashboard.title.notifications')}
            {activeTab === 'settings' && t('dashboard.title.settings')}
            {activeTab === 'in-progress' && t('dashboard.title.in.progress')}
            {activeTab === 'manage-tasks' && t('dashboard.title.manage.tasks')}
            {activeTab === 'freelancers' && t('dashboard.title.freelancers')}
            {activeTab === 'tutorials' && t('dashboard.title.tutorials')}
            {activeTab === 'swap' && t('dashboard.title.swap')}
            {activeTab === 'support' && t('dashboard.title.support')}
          </h1>
          <div className="header-actions">
            <div className="theme-language-buttons">
              <ThemeToggle variant="inline" visible={true} />
              <button
                type="button"
                className="language-toggle-button"
                onClick={toggle}
                aria-label={t('lang.toggle')}
                title={t('lang.toggle')}
              >
                <MdTranslate />
                <span>{lang === 'es' ? 'EN' : 'ES'}</span>
              </button>
            </div>
            <WalletButton />
            <div className="notification-dropdown-container" ref={notificationDropdownRef}>
              <button 
                className={`notification-button ${showNotificationDropdown ? 'active' : ''}`}
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <FaBell />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>
              
              {showNotificationDropdown && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <h3>{t('dashboard.notifications.title')}</h3>
                    <button 
                      className="close-dropdown-btn"
                      onClick={() => setShowNotificationDropdown(false)}
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  <div className="notification-dropdown-list">
                    {recentNotifications.length === 0 ? (
                      <div className="notification-dropdown-empty">
                        <p>{t('dashboard.notifications.no')}</p>
                      </div>
                    ) : (
                      recentNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`notification-dropdown-item ${notification.is_read ? 'read' : 'unread'}`}
                          onClick={() => {
                            if (!notification.is_read) {
                              markNotificationAsRead(notification.id);
                            }
                            setShowNotificationDropdown(false);
                            setActiveTab('notifications');
                          }}
                        >
                          <div className="notification-dropdown-icon" style={{ color: getNotificationColor(notification.type) }}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="notification-dropdown-content">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h4>{notification.title}</h4>
                              {notification.is_global && (
                                <span style={{ 
                                  fontSize: '10px', 
                                  padding: '2px 6px', 
                                  background: 'rgba(16, 221, 136, 0.2)', 
                                  color: 'var(--primary-green, #10dd88)',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <FaUsers style={{ fontSize: '10px' }} />
                                  {t('dashboard.notifications.global')}
                                </span>
                              )}
                            </div>
                            <p>{notification.message}</p>
                            <span className="notification-dropdown-time">{formatTimestamp(notification.created_at)}</span>
                          </div>
                          {!notification.is_read && (
                            <div className="notification-dropdown-dot"></div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {recentNotifications.length > 0 && (
                    <div className="notification-dropdown-footer">
                      <button 
                        className="view-all-notifications-btn"
                        onClick={() => {
                          setShowNotificationDropdown(false);
                          setActiveTab('notifications');
                        }}
                      >
                        {t('dashboard.notifications.view.all')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button 
              className="user-menu"
              onClick={() => setActiveTab('settings')}
            >
              <div className="user-avatar">
                {userData.name.charAt(0)}
              </div>
            </button>
          </div>
        </header>
        
        <div className="dashboard-content">
          {/* Stats Cards */}
          <div className="stats-cards">
            {stats.map(stat => (
              <div key={stat.id} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-info">
                  <h3>{stat.title}</h3>
                  <p>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Tasks Tab */}
          {/* Sección de Disputas Pendientes de Firma */}
          {pendingDisputes.length > 0 && (
            <div className="pending-disputes-section" style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(239, 68, 68, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '24px' }} />
                <h2 style={{ margin: 0, color: '#ef4444' }}>{t('dashboard.disputes.pending')} ({pendingDisputes.length})</h2>
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem' }}>
                Tienes disputas resueltas que requieren tu firma para liberar los fondos. Por favor, firma las transacciones desde tu wallet Freighter.
              </p>
              {pendingDisputes.map((dispute) => (
                <div key={dispute.dispute_id} style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>{t('dashboard.disputes.task')} {dispute.task_title}</h3>
                      <p style={{ margin: '0.5rem 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                        {dispute.user_role === 'client' 
                          ? `${t('dashboard.disputes.refund')} ${dispute.refund_amount.toFixed(2)} USDC`
                          : `${t('dashboard.disputes.payment')} ${dispute.payment_amount.toFixed(2)} USDC`
                        }
                      </p>
                      {dispute.resolution_reason && (
                        <p style={{ margin: '0.5rem 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', fontStyle: 'italic' }}>
                          {t('dashboard.disputes.reason')} {dispute.resolution_reason}
                        </p>
                      )}
                    </div>
                    {/* Nota: La funcionalidad de firmar transacciones de disputa ha sido eliminada.
                         Las disputas ahora se resuelven automáticamente a través de Trustless Work
                         en el panel de administración. */}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="tasks-container">
              <div className="tasks-header">
                <h2>{t('dashboard.tasks.title')}</h2>
                <button 
                  className="filters-toggle"
                  onClick={() => setShowFilters(!showFilters)}
                  aria-label="Toggle filters"
                >
                  <FiMenu />
                </button>
              </div>

              {/* Barra de búsqueda */}
              <div className="search-bar" style={{
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder={t('dashboard.tasks.search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '8px',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                  >
                    {t('dashboard.tasks.search.clear')}
                  </button>
                )}
              </div>

              <div className={`filters-wrapper ${showFilters ? 'active' : ''}`}>
                <div className="filter-container" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem',
                  width: '100%'
                }}>
                  <select
                    className="filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">{t('dashboard.tasks.filter.categories.all')}</option>
                    <option value="desarrollo">{t('dashboard.tasks.category.development')}</option>
                    <option value="diseño">{t('dashboard.tasks.category.design')}</option>
                    <option value="marketing">{t('dashboard.tasks.category.marketing')}</option>
                    <option value="blockchain">{t('dashboard.tasks.category.blockchain')}</option>
                    <option value="contenido">{t('dashboard.tasks.category.content')}</option>
                  </select>

                  <select
                    className="filter-select"
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                  >
                    <option value="all">{t('dashboard.tasks.filter.difficulty.all')}</option>
                    <option value="fácil">{t('dashboard.tasks.difficulty.easy')}</option>
                    <option value="intermedio">{t('dashboard.tasks.difficulty.medium')}</option>
                    <option value="difícil">{t('dashboard.tasks.difficulty.hard')}</option>
                  </select>

                  <input
                    type="number"
                    placeholder={t('dashboard.tasks.filter.price.min')}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className="filter-price-input"
                  />

                  <input
                    type="number"
                    placeholder={t('dashboard.tasks.filter.price.max')}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className="filter-price-input"
                  />

                  <select
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date_desc">{t('dashboard.tasks.filter.sort.recent')}</option>
                    <option value="date_asc">{t('dashboard.tasks.filter.sort.oldest')}</option>
                    <option value="price_asc">{t('dashboard.tasks.filter.sort.price.asc')}</option>
                    <option value="price_desc">{t('dashboard.tasks.filter.sort.price.desc')}</option>
                    <option value="popularity">{t('dashboard.tasks.filter.sort.popular')}</option>
                  </select>
                </div>
                
                {/* Badges de filtros activos */}
                {(searchQuery || minPrice || maxPrice || categoryFilter !== 'all' || difficultyFilter !== 'all') && (
                  <div style={{
                    marginTop: '1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>{t('dashboard.tasks.filter.active')}</span>
                    {searchQuery && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(16, 221, 136, 0.2)',
                        border: '1px solid rgba(16, 221, 136, 0.4)',
                        borderRadius: '50px',
                        fontSize: '0.85rem',
                        color: 'var(--primary-green, #10dd88)'
                      }}>
                        Búsqueda: {searchQuery}
                      </span>
                    )}
                    {minPrice && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(16, 221, 136, 0.2)',
                        border: '1px solid rgba(16, 221, 136, 0.4)',
                        borderRadius: '50px',
                        fontSize: '0.85rem',
                        color: 'var(--primary-green, #10dd88)'
                      }}>
                        Min: {minPrice} USDC
                      </span>
                    )}
                    {maxPrice && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(16, 221, 136, 0.2)',
                        border: '1px solid rgba(16, 221, 136, 0.4)',
                        borderRadius: '50px',
                        fontSize: '0.85rem',
                        color: 'var(--primary-green, #10dd88)'
                      }}>
                        Max: {maxPrice} USDC
                      </span>
                    )}
                    {categoryFilter !== 'all' && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(16, 221, 136, 0.2)',
                        border: '1px solid rgba(16, 221, 136, 0.4)',
                        borderRadius: '50px',
                        fontSize: '0.85rem',
                        color: 'var(--primary-green, #10dd88)'
                      }}>
                        {categoryFilter}
                      </span>
                    )}
                    {difficultyFilter !== 'all' && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(16, 221, 136, 0.2)',
                        border: '1px solid rgba(16, 221, 136, 0.4)',
                        borderRadius: '50px',
                        fontSize: '0.85rem',
                        color: 'var(--primary-green, #10dd88)'
                      }}>
                        {difficultyFilter}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setMinPrice('');
                        setMaxPrice('');
                        setCategoryFilter('all');
                        setDifficultyFilter('all');
                        setSortBy('date_desc');
                      }}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '50px',
                        fontSize: '0.85rem',
                        color: '#ef4444',
                        cursor: 'pointer'
                      }}
                      >
                        {t('dashboard.tasks.filter.clear.all')}
                      </button>
                  </div>
                )}
                
                {/* Contador de resultados */}
                <div style={{
                  marginTop: '1rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem'
                }}>
                  {filteredTasks.length} {filteredTasks.length === 1 ? t('dashboard.tasks.results.single') : t('dashboard.tasks.results.multiple')}
                </div>
              </div>
              
              <div className="tasks-grid">
                {loadingTasks && <p>{t('dashboard.tasks.loading')}</p>}
                {tasksError && <p className="error-message">{tasksError}</p>}
                {!loadingTasks && !tasksError && filteredTasks.length === 0 && (
                  <p>{t('dashboard.tasks.empty')}</p>
                )}
                {!loadingTasks && !tasksError && filteredTasks.map(task => (
                  <div key={task.id} className="task-card">
                    <div className="task-header">
                      <h3>{task.title}</h3>
                      <span className={`task-difficulty ${task.difficulty.toLowerCase()}`}>
                        {task.difficulty}
                      </span>
                    </div>
                    <p className="task-description">{task.subtitle}</p>
                    <div className="task-details">
                      <div className="task-detail">
                        <span className="task-detail-label">{t('dashboard.tasks.reward')}</span>
                        <span className="task-detail-value">
                          {parseFloat(task.price).toFixed(2)} {task.currency}
                        </span>
                      </div>
                      <div className="task-detail">
                        <span className="task-detail-label">{t('dashboard.tasks.creator')}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <Link 
                            to={`/profile/${task.creator_id || task.id}`}
                            className="task-creator-link"
                            style={{
                              color: 'var(--primary-blue)',
                              textDecoration: 'none',
                              fontWeight: 500,
                              transition: 'all 0.3s ease'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = 'none';
                            }}
                          >
                            {task.creator_username}
                          </Link>
                          {task.creator_rating !== undefined && task.creator_rating > 0 && (
                            <RatingDisplay
                              averageRating={task.creator_rating}
                              totalRatings={task.creator_total_ratings || 0}
                              size="small"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <button className="task-button" onClick={() => handleApplyTaskClick(task.id)}>
                      {t('dashboard.tasks.apply')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Wallet Tab */}
          {activeTab === 'wallet' && (
            <div className="wallet-container">
              <div className="wallet-balance">
                <h2>{t('dashboard.wallet.total.earnings')}</h2>
                <div className="balance-amount">${totalEarnings.toFixed(2)}</div>
                {totalPaid > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {t('dashboard.wallet.total.paid')} ${totalPaid.toFixed(2)}
                  </div>
                )}
                <p className="wallet-description">
                  {t('dashboard.wallet.description')}
                </p>
              </div>
              
              <div className="transactions-container">
                <h2>{t('dashboard.wallet.transactions')}</h2>
                {loadingTransactions && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {t('dashboard.wallet.transactions.loading')}
                  </div>
                )}
                {transactionsError && (
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#ef4444', marginBottom: '1rem' }}>
                    {transactionsError}
                  </div>
                )}
                {!loadingTransactions && !transactionsError && transactions.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {t('dashboard.wallet.transactions.empty')}
                  </div>
                )}
                {!loadingTransactions && transactions.length > 0 && (
                  <>
                <div className="transactions-table">
                  <div className="transactions-header">
                    <div className="transaction-cell">{t('dashboard.wallet.transactions.date')}</div>
                    <div className="transaction-cell">{t('dashboard.wallet.transactions.task')}</div>
                        <div className="transaction-cell">{t('dashboard.wallet.transactions.type')}</div>
                    <div className="transaction-cell">{t('dashboard.wallet.transactions.amount')}</div>
                    <div className="transaction-cell">{t('dashboard.wallet.transactions.status')}</div>
                  </div>
                  {transactions.map(transaction => (
                    <div key={transaction.id} className="transaction-row">
                          <div className="transaction-cell">
                            {new Date(transaction.date).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="transaction-cell">
                            <Link 
                              to={`/task/${transaction.task_id}`}
                              style={{ color: 'var(--primary-green, #10dd88)', textDecoration: 'none' }}
                            >
                              {transaction.task_title}
                            </Link>
                          </div>
                          <div className="transaction-cell">
                            <span className={`transaction-type ${transaction.type}`}>
                              {transaction.type === 'received' ? t('dashboard.wallet.transactions.received') : t('dashboard.wallet.transactions.paid')}
                            </span>
                          </div>
                          <div className="transaction-cell" style={{
                            color: transaction.type === 'received' ? '#22c55e' : '#ef4444',
                            fontWeight: '600'
                          }}>
                            {transaction.type === 'received' ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)} {transaction.currency}
                          </div>
                      <div className="transaction-cell">
                        <span className="transaction-status completed">
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                    {transactionsTotalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <button
                          onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                          disabled={transactionsPage === 1}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: transactionsPage === 1 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(16, 221, 136, 0.2)',
                            border: '1px solid rgba(16, 221, 136, 0.4)',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: transactionsPage === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {t('dashboard.wallet.transactions.previous')}
                        </button>
                        <span style={{ padding: '0.5rem 1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                          {t('dashboard.wallet.transactions.page')} {transactionsPage} {t('dashboard.wallet.transactions.of')} {transactionsTotalPages}
                        </span>
                        <button
                          onClick={() => setTransactionsPage(p => Math.min(transactionsTotalPages, p + 1))}
                          disabled={transactionsPage >= transactionsTotalPages}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: transactionsPage >= transactionsTotalPages ? 'rgba(255, 255, 255, 0.05)' : 'rgba(16, 221, 136, 0.2)',
                            border: '1px solid rgba(16, 221, 136, 0.4)',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: transactionsPage >= transactionsTotalPages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {t('dashboard.wallet.transactions.next')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          
          
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="notifications-container">
              <div className="notifications-header">
                <h2>
                  {t('dashboard.notifications.title')}
                  {unreadCount > 0 && (
                    <span className="unread-badge">{unreadCount}</span>
                  )}
                </h2>
                <div className="notifications-actions">
                  {unreadCount > 0 && (
                    <button 
                      className="mark-all-read"
                      onClick={markAllNotificationsAsRead}
                    >
                      {t('dashboard.notifications.mark.all.read')}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Filter Tabs */}
              <div className="notifications-filters">
                <button 
                  className={`filter-tab ${notificationFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setNotificationFilter('all')}
                >
                  {t('dashboard.notifications.filter.all')} ({notifications.length})
                </button>
                <button 
                  className={`filter-tab ${notificationFilter === 'unread' ? 'active' : ''}`}
                  onClick={() => setNotificationFilter('unread')}
                >
                  {t('dashboard.notifications.filter.unread')} ({unreadCount})
                </button>
                <button 
                  className={`filter-tab ${notificationFilter === 'success' ? 'active' : ''}`}
                  onClick={() => setNotificationFilter('success')}
                >
                  {t('dashboard.notifications.filter.success')}
                </button>
                <button 
                  className={`filter-tab ${notificationFilter === 'warning' ? 'active' : ''}`}
                  onClick={() => setNotificationFilter('warning')}
                >
                  {t('dashboard.notifications.filter.warning')}
                </button>
                <button 
                  className={`filter-tab ${notificationFilter === 'error' ? 'active' : ''}`}
                  onClick={() => setNotificationFilter('error')}
                >
                  {t('dashboard.notifications.filter.error')}
                </button>
              </div>
              
              {/* Notifications List */}
              <div className="notifications-list">
                {loadingNotifications ? (
                  <div className="no-notifications">
                    <div className="no-notifications-icon"></div>
                    <h3>{t('common.loading.notifications')}</h3>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="no-notifications">
                    <div className="no-notifications-icon"><FaBell aria-hidden="true" /></div>
                    <h3>{t('dashboard.notifications.no')}</h3>
                    <p>
                      {notificationFilter === 'unread' 
                        ? t('dashboard.notifications.no.unread')
                        : t('dashboard.notifications.no.filter')
                      }
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                    >
                      <div className="notification-content">
                        <div className="notification-icon-container">
                          <span 
                            className="notification-icon"
                            style={{ color: getNotificationColor(notification.type) }}
                          >
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>
                        <div className="notification-text">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h4 className="notification-title">{notification.title}</h4>
                            {notification.is_global && (
                              <span style={{ 
                                fontSize: '11px', 
                                padding: '3px 8px', 
                                background: 'rgba(16, 221, 136, 0.2)', 
                                color: 'var(--primary-green, #10dd88)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: '600'
                              }}>
                                <FaUsers style={{ fontSize: '10px' }} />
                                {t('dashboard.notifications.global')}
                              </span>
                            )}
                          </div>
                          <p className="notification-message">{notification.message}</p>
                          <div className="notification-meta">
                            <span className="notification-time">
                              {formatTimestamp(notification.created_at)}
                            </span>
                            {!notification.is_read && (
                              <span className="unread-indicator"></span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="notification-actions">
                        {!notification.is_read && (
                          <button 
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="mark-read-button"
                          >
                             {t('dashboard.notifications.mark.read')}
                          </button>
                        )}
                        
                        <button 
                          onClick={() => deleteNotification(notification.id)}
                          className="delete-button"
                          aria-label={t('dashboard.notifications.delete')}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Freelancers Tab */}
          {activeTab === 'freelancers' && (
            <FreelancersList />
          )}
          
          {/* Swap Tab */}
          {activeTab === 'swap' && (
            <SwapPage />
          )}
          
          {/* Tutorials Tab */}
          {activeTab === 'tutorials' && (
            <TutorialsTab />
          )}
          
          {/* Support Tab */}
          {activeTab === 'support' && (
            <SupportPage />
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="settings-container">
              <div className="settings-header">
              <h2>{t('dashboard.settings.title')}</h2>
                <Link 
                  to="/dashboard/settings/profile" 
                  className="edit-profile-button"
                >
                  <FaUser />
                  <span>{t('dashboard.settings.edit.profile')}</span>
                </Link>
                  </div>

              {loadingProfile ? (
                <div className="settings-loading">
                  <div className="spinner"></div>
                  <p>{t('dashboard.settings.loading')}</p>
                </div>
              ) : (
                <>
                  {/* Perfil Visual */}
                  <div className="profile-display-card">
                    <div className="profile-display-header">
                      <div className="profile-avatar-display">
                        {userProfile?.avatar_url ? (
                          <img
                            loading="lazy"
                            decoding="async" 
                            src={getAvatarUrl(userProfile.avatar_url)} 
                            alt={userProfile.username}
                            className="profile-avatar-img"
                            onError={(e) => {
                              // Si la imagen falla, mostrar placeholder
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder && placeholder.classList.contains('profile-avatar-placeholder-display')) {
                                placeholder.style.display = 'flex';
                              }
                            }}
                          />
                        ) : (
                          <div className="profile-avatar-placeholder-display">
                            <FaUser />
                          </div>
                        )}
                        {userProfile?.verified && (
                          <div className="verified-badge-display" title={t('dashboard.settings.verified')}>
                            <FaCheckCircle />
                          </div>
                        )}
                      </div>
                      <div className="profile-info-display">
                        <h3>{userProfile?.username || name}</h3>
                        <p className="profile-email">{userProfile?.email || email}</p>
                        {userProfile?.bio && (
                          <p className="profile-bio-display">{userProfile.bio}</p>
                        )}
                        {userProfile?.portfolio_url && (
                          <a 
                            href={userProfile.portfolio_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="portfolio-link-display"
                          >
                            <FaGlobe />
                            <span>{t('dashboard.settings.view.portfolio')}</span>
                          </a>
                        )}
                  </div>
                </div>
                
                    {/* Estadísticas rápidas */}
                    {userStats && (
                      <div className="profile-stats-display">
                        <div className="stat-item-display">
                          <span className="stat-label-display">{t('dashboard.settings.stats.completed')}</span>
                          <span className="stat-value-display">{userStats.tasks_completed}</span>
                  </div>
                        <div className="stat-item-display">
                          <span className="stat-label-display">{t('dashboard.settings.stats.created')}</span>
                          <span className="stat-value-display">{userStats.tasks_created}</span>
                  </div>
                        <div className="stat-item-display">
                          <span className="stat-label-display">{t('dashboard.settings.stats.total.earned')}</span>
                          <span className="stat-value-display">${userStats.total_earned.toFixed(2)}</span>
                </div>
                        {userStats.average_rating > 0 && (
                          <div className="stat-item-display">
                            <span className="stat-label-display">{t('dashboard.settings.stats.rating')}</span>
                            <span className="stat-value-display">
                              {userStats.average_rating.toFixed(1)} <FaStar style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Configuración de privacidad */}
                    <div className="privacy-setting-display">
                      <div className="privacy-info">
                        <FaLock />
                        <div>
                          <strong>{userProfile?.public_profile ? t('dashboard.settings.privacy.public') : t('dashboard.settings.privacy.private')}</strong>
                          <p>{userProfile?.public_profile ? t('dashboard.settings.privacy.public.desc') : t('dashboard.settings.privacy.private.desc')}</p>
                  </div>
                  </div>
                  </div>
                </div>
                
                  {/* Información de cuenta básica */}
                  <div className="settings-info-card">
                    <h3>{t('dashboard.settings.account.info')}</h3>
                    <div className="info-row">
                      <span className="info-label">{t('dashboard.settings.account.username')}</span>
                      <span className="info-value">{userProfile?.username || name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{t('dashboard.settings.account.email')}</span>
                      <span className="info-value">{userProfile?.email || email}</span>
                    </div>
                    {userProfile?.member_since && (
                      <div className="info-row">
                        <span className="info-label">{t('dashboard.settings.account.member.since')}</span>
                        <span className="info-value">
                          {new Date(userProfile.member_since).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                </div>
                
                  {/* Skills y Portfolio Preview */}
                  {userProfile && (userProfile.skills?.length > 0 || userProfile.portfolio?.length > 0) && (
                    <div className="settings-preview-card">
                      <h3>{t('dashboard.settings.skills.portfolio')}</h3>
                      {userProfile.skills && userProfile.skills.length > 0 && (
                        <div className="skills-preview">
                          <span className="preview-label">{t('dashboard.settings.skills')}</span>
                          <div className="skills-tags">
                            {userProfile.skills.slice(0, 5).map((skill, idx) => (
                              <span key={idx} className="skill-tag-preview">
                                {skill.name}
                              </span>
                            ))}
                            {userProfile.skills.length > 5 && (
                              <span className="skill-tag-preview more">
                                +{userProfile.skills.length - 5} más
                              </span>
                            )}
                </div>
                        </div>
                      )}
                      {userProfile.portfolio && userProfile.portfolio.length > 0 && (
                        <div className="portfolio-preview">
                          <span className="preview-label">{t('dashboard.settings.portfolio.projects')}</span>
                          <span className="portfolio-count">{userProfile.portfolio.length} {t('dashboard.settings.portfolio.count')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botones para editar y ver perfil */}
                  <div className="settings-edit-section">
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <Link 
                        to="/dashboard/settings/profile" 
                        className="edit-full-profile-button"
                      >
                        <FaUser />
                        <span>{t('dashboard.settings.edit.profile')}</span>
                      </Link>
                      <Link 
                        to={`/profile/${user?.id || storedUserData?.id || ''}`} 
                        className="edit-full-profile-button"
                        style={{ background: 'var(--primary-blue)', color: '#fff' }}
                      >
                        <FaGlobe />
                        <span>Ver Perfil Público</span>
                      </Link>
                    </div>
                    <p className="edit-hint">{t('dashboard.settings.edit.hint')}</p>
                  </div>

                  {/* Botón para cerrar sesión */}
                  <div className="settings-logout-section">
                    <button 
                      className="settings-logout-button"
                      onClick={async () => {
                        if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                          try {
                            await logout();
                            // Redirigir al inicio después de cerrar sesión
                            window.location.href = '/';
                          } catch (error) {
                            console.error('Error al cerrar sesión:', error);
                          }
                        }
                      }}
                    >
                      <FaSignOutAlt />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Tasks in Progress Tab */}
          {activeTab === 'in-progress' && (
            <div className="tasks-in-progress-container">
              <div className="section-header">
                <h2>{t('dashboard.in.progress.title')}</h2>
                <select 
                  className="filter-dropdown"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">{t('dashboard.tasks.filter.categories.all')}</option>
                  <option value="Blockchain">Blockchain</option>
                  <option value="Diseño">Diseño</option>
                  <option value="Desarrollo">Desarrollo</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
              
              <div className="tasks-grid">
                {loadingAcceptedTasks && <p>{t('dashboard.in.progress.loading')}</p>}
                {acceptedTasksError && <p className="error-message">{acceptedTasksError}</p>}
                {!loadingAcceptedTasks && !acceptedTasksError && acceptedTasks.length === 0 && (
                  <p>{t('dashboard.in.progress.empty')}</p>
                )}
                {!loadingAcceptedTasks && !acceptedTasksError && acceptedTasks.length > 0 && acceptedTasks
                  .filter(task => categoryFilter === 'all' || task.category.toLowerCase() === categoryFilter.toLowerCase())
                  .map(task => (
                    <div key={task.id} className="task-card">
                      <div className="task-header">
                        <h3>{task.title}</h3>
                        {task.difficulty && (
                          <span className={`task-difficulty ${task.difficulty.toLowerCase()}`}>
                          {task.difficulty}
                        </span>
                        )}
                      </div>
                      <p className="task-description">{task.subtitle}</p>
                      <div className="task-details">
                        {task.price && task.currency && (
                          <div className="task-detail">
                            <span className="task-detail-label">Recompensa</span>
                            <span className="task-detail-value">
                              {parseFloat(task.price).toFixed(2)} {task.currency}
                            </span>
                        </div>
                        )}
                        {task.creator_username && (
                          <div className="task-detail">
                            <span className="task-detail-label">Creador</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <Link 
                                to={`/profile/${task.creator_id || task.id}`}
                                className="task-creator-link"
                                style={{
                                  color: 'var(--primary-blue)',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                  transition: 'all 0.3s ease'
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.textDecoration = 'underline';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.textDecoration = 'none';
                                }}
                              >
                                {task.creator_username}
                              </Link>
                              {task.creator_rating !== undefined && task.creator_rating > 0 && (
                                <RatingDisplay
                                  averageRating={task.creator_rating}
                                  totalRatings={task.creator_total_ratings || 0}
                                  size="small"
                                />
                              )}
                            </div>
                        </div>
                        )}
                      </div>
                      {/* Botón de acción para Tareas en Progreso (visible para el trabajador aceptado) */}
                       {/* Comprobamos si el usuario logueado es el trabajador aceptado para esta tarea */}
                       <button
                           className="task-button btn-primary" // Puedes usar una clase de botón existente o definir una nueva
                           onClick={() => {
                               handleSuperviseTaskClick(task.id, task.accepted_applicant_id);
                           }}
                       >
                           Trabajar
                       </button>
                        </div>
                  ))}
                        </div>
            </div>
          )}
          
          {/* Nueva sección para Administrar Tareas */}
          {activeTab === 'manage-tasks' && (
            <div className="manage-tasks-container">
              <div className="section-header">
                <h2>{t('dashboard.manage.tasks.title')}</h2>
                <button className="create-task-button" onClick={handleCreateTaskClick}>
                  <FaPlus />
                  <h3>{t('dashboard.manage.tasks.create.new')}</h3>
                </button>
              </div>

              {/* Aquí se listarán las tareas creadas por el usuario */}
              {loadingUserTasks && <p>{t('dashboard.manage.tasks.loading')}</p>}
              {userTasksError && <p className="error-message">{userTasksError}</p>}
              {!loadingUserTasks && userTasks.length === 0 && !userTasksError && <p>{t('dashboard.manage.tasks.empty')}</p>}

              {!loadingUserTasks && userTasks.length > 0 && (
                <div className="user-tasks-list">
                  {userTasks.map(task => (
                    <div key={task.id} className="user-task-item">
                      <h3>{task.title}</h3>
                      <p>{task.subtitle}</p>
                      {/* Mostrar el número de propuestas */}
                      <div className="proposal-count">
                        {t('dashboard.manage.tasks.proposals')} {task.proposal_count !== undefined ? task.proposal_count : t('common.loading')}
                      </div>
                      {/* Botones de acción (Editar, Ver Propuestas, etc.) - **Corregido** */}
                      <div className="task-actions">
                         {/* Lógica condicional para mostrar el botón "Supervisar" o "Ver Propuestas" */}
                         {task.has_accepted_proposal ? (
                             // Mostrar botón Supervisar si hay una propuesta aceptada
                             <button
                                 className="btn-primary" // O la clase que prefieras para este botón
                                 onClick={() => handleSuperviseTaskClick(task.id, task.accepted_applicant_id)}
                             >
                                 {t('dashboard.manage.tasks.supervise')}
                             </button>
                         ) : (
                             // Mostrar botón Ver Propuestas si no hay propuestas aceptadas
                             <button
                                 className="btn-secondary"
                                 onClick={() => navigate(`/proposals/${task.id}`)}
                             >
                                 {t('dashboard.manage.tasks.view.proposals')} ({task.proposal_count !== undefined ? task.proposal_count : 0})
                             </button>
                         )}
                         {/* Botón de Editar Tarea (opcional, para más tarde) */}
                         {/* <button className="btn-secondary">Editar</button> */}
                      </div>
                    </div>
                  ))}
              </div>
              )}

            </div>
          )}
        </div>
        
        {/* Botón flotante para crear tarea (solo en la pestaña Tareas) */}
        {activeTab === 'tasks' && (
          <button className="create-task-button" onClick={handleCreateTaskClick}>
            <FaPlus className="create-task-icon" />
            <span className="create-task-text">{t('dashboard.create.task')}</span>
          </button>
        )}
      </div>
      </div>
      
      {/* Footer */}
      <DashboardFooter />

      {/* Popup de Notificaciones Pendientes - ELIMINADO */}
      {/* <PendingNotificationsPopup
        isOpen={showPendingNotificationsPopup}
        onClose={() => setShowPendingNotificationsPopup(false)}
        pendingTasks={pendingActionsTasks}
        onSendNotifications={async () => {
          alert(`Se enviarán notificaciones a ${pendingActionsTasks.length} trabajador(es). Esta funcionalidad estará disponible próximamente.`);
          setShowPendingNotificationsPopup(false);
        }}
      /> */}
    </div>
  );
};

export default Dashboard;

