import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaClock, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import '../css/CreateTask.css';
import axios from 'axios';
import Popup from './Popup';
import { API_URL } from '../config/database';
import { calculateCommission, calculateNetAmount } from '../config/commission';

interface UserLimits {
  can_create: boolean;
  cooldown_remaining: number;
  tasks_today: number;
  tasks_this_week: number;
  next_task_time: string;
}

const CreateTask = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'XLM', // Moneda por defecto (Stellar Lumens)
    difficulty: 'Fácil',
    category: 'Desarrollo',
    subtitle: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null);
  
  // Estados para monto neto y comisión
  const [netAmount, setNetAmount] = useState<string>('');
  const [commissionAmount, setCommissionAmount] = useState<string>('');
  
  // Estados para el popup
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState<'success' | 'error'>('success');
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');

  // Obtener el usuario logeado
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Función para cargar límites del usuario
  const loadUserLimits = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axios.get(`${API_URL}/auth/task_stats.php?user_id=${user.id}`);
      setUserLimits(response.data);
    } catch (error: any) {
      // Para usuarios nuevos, establecer valores por defecto que permitan crear tareas
      setUserLimits({
        can_create: true,
        cooldown_remaining: 0,
        tasks_today: 0,
        tasks_this_week: 0,
        next_task_time: 'Ahora'
      });
    }
  };

  // Cargar límites del usuario al montar el componente
  useEffect(() => {
    loadUserLimits();
    
    // Recargar límites cada 30 segundos para mantener actualizado el cooldown
    const interval = setInterval(() => {
      loadUserLimits();
    }, 30000); // 30 segundos
    
    // Recargar límites cuando el usuario regrese a la pestaña
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUserLimits();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  // Calcular monto neto y comisión en tiempo real cuando cambia el precio
  useEffect(() => {
    if (formData.price && formData.price.trim() !== '') {
      const price = parseFloat(formData.price);
      if (!isNaN(price) && price > 0) {
        const commission = calculateCommission(price);
        const net = calculateNetAmount(price);
        setCommissionAmount(commission.toFixed(7));
        setNetAmount(net.toFixed(7));
      } else {
        setNetAmount('');
        setCommissionAmount('');
      }
    } else {
      setNetAmount('');
      setCommissionAmount('');
    }
  }, [formData.price]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  // Función para formatear tiempo restante
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Función para mostrar popup de éxito
  const showSuccessPopup = (title: string, message: string) => {
    setPopupType('success');
    setPopupTitle(title);
    setPopupMessage(message);
    setShowPopup(true);
  };

  // Función para mostrar popup de error
  const showErrorPopup = (title: string, message: string) => {
    setPopupType('error');
    setPopupTitle(title);
    setPopupMessage(message);
    setShowPopup(true);
  };

  // Función para cerrar popup
  const closePopup = () => {
    setShowPopup(false);
  };

  // Función para manejar el botón del popup
  const handlePopupButton = () => {
    if (popupType === 'success') {
      // Redirigir al dashboard si es éxito
      navigate('/dashboard');
    } else {
      // Solo cerrar el popup si es error
      closePopup();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validar que el usuario está logeado
    if (!user || !user.id) {
      showErrorPopup('Error de Autenticación', 'Debes estar logeado para crear una tarea.');
      setLoading(false);
      return;
    }

    // Validar límites del usuario (solo si se cargaron correctamente)
    if (userLimits && userLimits.can_create === false) {
      if (userLimits.cooldown_remaining > 0) {
        showErrorPopup('Tiempo de Espera', `Debes esperar ${formatTime(userLimits.cooldown_remaining)} para crear otra tarea.`);
      } else {
        showErrorPopup('Límite Alcanzado', `Has alcanzado el límite de tareas. Hoy: ${userLimits.tasks_today}/5, Esta semana: ${userLimits.tasks_this_week}/50`);
      }
      setLoading(false);
      return;
    }
    
    // Si no hay límites cargados, permitir crear (usuario nuevo)
    // El backend validará los límites reales

    try {
      // Enviar los datos de la tarea a la API PHP
      const response = await axios.post(`${API_URL}/auth/create_task.php`, {
        ...formData,
        user_id: user.id
      });

      // Verificar si la respuesta es exitosa (200-299) o si tiene el mensaje de éxito
      if (response.status >= 200 && response.status < 300 && response.data && response.data.message) {
        showSuccessPopup('¡Tarea Creada!', 'Tu tarea ha sido publicada exitosamente. Los trabajadores podrán verla y aplicar.');
        setFormData({
          title: '',
          description: '',
          price: '',
          currency: 'XLM',
          difficulty: 'Fácil',
          category: 'Desarrollo',
          subtitle: ''
        });
        
        // Recargar límites del usuario (con manejo de errores)
        try {
          const limitsResponse = await axios.get(`${API_URL}/auth/task_stats.php?user_id=${user.id}`);
          if (limitsResponse.data) {
            setUserLimits(limitsResponse.data);
          }
        } catch (limitsError: any) {
          // No mostrar error al usuario, solo loguear
          // Recargar límites con valores por defecto
          setUserLimits({
            can_create: true,
            cooldown_remaining: 0,
            tasks_today: 0,
            tasks_this_week: 0,
            next_task_time: 'Ahora'
          });
        }
      } else {
        showErrorPopup('Error del Servidor', 'Respuesta inesperada del servidor.');
      }

    } catch (err: any) {
      // Si el error es 201 (Created), la tarea se creó exitosamente
      if (err.response && err.response.status === 201) {
        showSuccessPopup('¡Tarea Creada!', 'Tu tarea ha sido publicada exitosamente. Los trabajadores podrán verla y aplicar.');
        setFormData({
          title: '',
          description: '',
          price: '',
          currency: 'XLM',
          difficulty: 'Fácil',
          category: 'Desarrollo',
          subtitle: ''
        });
        
        // Recargar límites
        try {
          await loadUserLimits();
        } catch (e) {
        }
      } else {
        showErrorPopup('Error al Crear Tarea', err.response?.data?.message || 'Error al crear la tarea.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-task-container">
      <Link to="/dashboard" className="back-button">
        <FaArrowLeft />
        <span>Volver al Dashboard</span>
      </Link>

      <div className="create-task-form-card">
        <h2>Crear Nueva Tarea</h2>
        
        {/* Mostrar límites del usuario */}
        {userLimits ? (
          <div className="user-limits-info">
            <div className="limit-item">
              <FaClock />
              <span>Tareas hoy: {userLimits.tasks_today}/5</span>
            </div>
            <div className="limit-item">
              <FaCheckCircle />
              <span>Tareas esta semana: {userLimits.tasks_this_week}/50</span>
            </div>
            {userLimits.cooldown_remaining > 0 && (
              <div className="limit-item cooldown-item">
                <FaExclamationTriangle />
                <span>Cooldown: {formatTime(userLimits.cooldown_remaining)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="user-limits-info">
            <div className="limit-item">
              <FaCheckCircle />
              <span>Cargando límites...</span>
            </div>
          </div>
        )}

        {/* Advertencia de límites */}
        {userLimits && userLimits.can_create === false && (
          <div className="timeout-warning">
            <div className="warning-header">
              <div className="warning-icon-wrapper">
                <FaClock className="warning-icon" />
              </div>
              <div className="warning-title-section">
                <h3>
                  {userLimits.cooldown_remaining > 0 ? 'Tiempo de Espera Activo' : 'Límite Alcanzado'}
                </h3>
                {userLimits.cooldown_remaining > 0 && (
                  <div className="cooldown-badge">
                    <span className="cooldown-time">{formatTime(userLimits.cooldown_remaining)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="warning-content">
              {userLimits.cooldown_remaining > 0 ? (
                <>
                  <div className="warning-message">
                    <p>Debes esperar <strong className="highlight-time">{formatTime(userLimits.cooldown_remaining)}</strong> para crear otra tarea</p>
                  </div>
                  <div className="next-task-info">
                    <FaCheckCircle className="info-icon" />
                    <span>Próxima tarea disponible: <strong>{userLimits.next_task_time}</strong></span>
                  </div>
                </>
              ) : (
                <>
                  <div className="warning-message">
                    <p>Has alcanzado el límite de tareas para hoy o esta semana</p>
                  </div>
                  <div className="limits-stats">
                    <div className="limit-stat-item">
                      <span className="limit-label">Tareas hoy:</span>
                      <span className="limit-value">{userLimits.tasks_today}/5</span>
                    </div>
                    <div className="limit-stat-item">
                      <span className="limit-label">Esta semana:</span>
                      <span className="limit-value">{userLimits.tasks_this_week}/50</span>
                    </div>
                  </div>
                  <p className="limit-hint">Intenta mañana o la próxima semana</p>
                </>
              )}
            </div>
          </div>
        )}


        <form onSubmit={handleSubmit} className="create-task-form">
          {/* Información básica */}
          <div className="form-section">
            <h3>📝 Información Básica</h3>
            
            <div className="form-group">
              <label htmlFor="title">Título de la Tarea *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ej: Desarrollo de aplicación web"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="subtitle">Subtítulo (opcional)</label>
              <input
                type="text"
                id="subtitle"
                name="subtitle"
                value={formData.subtitle}
                onChange={handleChange}
                placeholder="Breve descripción adicional"
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descripción Detallada *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe en detalle qué necesitas que se haga..."
                rows={4}
                required
              />
            </div>

          </div>

          {/* Presupuesto y categorización */}
          <div className="form-section">
            <h3>💰 Presupuesto y Categorización</h3>
            
            {/* Información del precio - Arriba del campo */}
            {formData.price && netAmount && commissionAmount && (
              <div className="net-amount-display">
                <p className="net-amount-text">
                  💰 Trabajador recibirá: <strong>{netAmount} XLM</strong>
                </p>
                <p className="commission-text">
                  📊 Comisión (0.3%): {commissionAmount} XLM
                </p>
                <p className="contract-cost-text">
                  ⚠️ Costo contrato: <strong>2.5 XLM</strong> para crear la cuenta escrow + fees de transacción
                </p>
              </div>
            )}
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">Precio a Pagar *</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="100"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="currency">Moneda *</label>
                <input
                  type="text"
                  id="currency"
                  name="currency"
                  value="XLM"
                  readOnly
                  disabled
                  className="currency-readonly"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Categoría *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="Desarrollo">Desarrollo</option>
                  <option value="Diseño">Diseño</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Blockchain">Blockchain</option>
                  <option value="Contenido">Contenido</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Dificultad *</label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  required
                >
                  <option value="Fácil">Fácil</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Difícil">Difícil</option>
                </select>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="form-section">
            <h3>ℹ️ Información Adicional</h3>
            <div className="info-box">
              <p><strong>¿Cómo funciona?</strong></p>
              <ul>
                <li>Publica tu tarea y recibe propuestas de trabajadores calificados</li>
                <li>Revisa las propuestas y selecciona al mejor candidato para tu proyecto</li>
                <li>Se creará automáticamente un contrato inteligente (escrow) en Stellar para garantizar el pago seguro</li>
                <li>El trabajador recibirá el pago al completar y entregar la tarea satisfactoriamente</li>
                <li>Ambas partes deben aceptar la finalización para liberar los fondos</li>
              </ul>
              <p style={{ marginTop: '1rem' }}><strong>💰 Sobre los costos:</strong></p>
              <ul>
                <li><strong>Comisión ArcusX (0.3%):</strong> Se retiene automáticamente del pago al trabajador. El trabajador recibirá el monto neto (99.7% del total) al completar la tarea.</li>
                <li><strong>Costo de creación de contrato:</strong> 2.5 XLM para crear la cuenta escrow única en Stellar + fees de transacción (~0.00001 XLM).</li>
                <li><strong>Total a pagar:</strong> El monto de la tarea que estableces en XLM + 2.5 XLM para crear el escrow. La comisión del 0.3% se deduce del pago al trabajador, no es un costo adicional para ti.</li>
                <li><strong>Importante:</strong> El sistema usa XLM (Lumens nativos de Stellar). Se requiere 2.5 XLM para crear la cuenta escrow + el precio de la tarea para fondear.</li>
                <li>Estos costos garantizan la seguridad de las transacciones y el mantenimiento de la plataforma.</li>
              </ul>
            </div>
          </div>

          {/* Botón de envío */}
          <div className="form-actions">
            <button 
              type="submit" 
              disabled={loading || (userLimits?.can_create === false) || false}
              className="submit-button"
              style={{
                opacity: (loading || (userLimits && userLimits.can_create === false)) ? 0.5 : 1
              }}
            >
              {loading ? 'Creando...' : 
               (userLimits && userLimits.can_create === false) ? 'Límite alcanzado' :
               'Publicar Tarea'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Popup para mensajes */}
      <Popup
        isOpen={showPopup}
        onClose={closePopup}
        type={popupType}
        title={popupTitle}
        message={popupMessage}
        buttonText={popupType === 'success' ? 'Entendido' : 'Entiendo'}
        onButtonClick={handlePopupButton}
      />
    </div>
  );
};

export default CreateTask;