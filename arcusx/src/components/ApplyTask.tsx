import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config/database';
import '../css/ApplyTask.css'; // Necesitas crear este archivo CSS

interface TaskData {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  currency: string;
  difficulty: string;
  category: string;
  creator_username: string;
  created_at: string;
}

interface ApplicationData {
  message: string;
  portfolioUrl: string;
  walletAddress: string;
}

const ApplyTask = () => {
  const { taskId } = useParams<{ taskId: string }>(); // Obtener el ID de la tarea de la URL
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para el formulario de aplicación
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    message: '',
    portfolioUrl: '',
    walletAddress: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  
  // Estados para popups
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // Obtener usuario logeado para el ID del aplicante
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  // Obtener platform fee del backend

  // Función para manejar cambios en el formulario
  const handleInputChange = (field: keyof ApplicationData, value: string) => {
    setApplicationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para validar dirección Stellar (empieza con G y tiene 56 caracteres)
  const isValidStellarAddress = (address: string) => {
    // Direcciones Stellar empiezan con G y tienen 56 caracteres
    // Validación más permisiva: solo verifica longitud y que empiece con G
    const trimmed = address.trim();
    return trimmed.length === 56 && trimmed.startsWith('G') && /^G[A-Z0-9]{55}$/.test(trimmed);
  };

  // Efecto para cargar los detalles de la tarea al montar el componente
  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Crear este endpoint en el backend
        const response = await axios.get(`${API_URL}/auth/get_task_details.php?task_id=${taskId}`);
        if (response.data) {
          setTask(response.data);
        } else {
          setError('No se encontraron detalles para esta tarea.');
        }
      } catch (err: any) {
        setError('Error al cargar los detalles de la tarea: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchTask();
    } else {
      setError('ID de tarea no proporcionado.');
      setLoading(false);
    }
  }, [taskId]); // Ejecutar efecto cuando cambie el taskId de la URL

  // Manejar el envío del formulario de aplicación
  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage('');
    setSubmitError('');
    setSubmitting(true);

    if (!user || !user.id) {
      setSubmitError('Debes estar logeado para aplicar a una tarea.');
      setShowErrorPopup(true);
      setSubmitting(false);
      return;
    }

    if (!task?.id) {
        setSubmitError('No se pudo obtener el ID de la tarea para aplicar.');
        setShowErrorPopup(true);
        setSubmitting(false);
        return;
    }

    // Validar campos requeridos
    if (!applicationData.message.trim()) {
      setSubmitError('El mensaje de presentación es obligatorio.');
      setShowErrorPopup(true);
      setSubmitting(false);
      return;
    }

    if (!applicationData.walletAddress.trim()) {
      setSubmitError('La dirección de wallet es obligatoria para recibir pagos.');
      setShowErrorPopup(true);
      setSubmitting(false);
      return;
    }

    if (!isValidStellarAddress(applicationData.walletAddress)) {
      setSubmitError('La dirección de wallet Stellar no tiene un formato válido (debe empezar con G y tener 56 caracteres).');
      setShowErrorPopup(true);
      setSubmitting(false);
      return;
    }

    try {
      // Validar que todos los campos estén presentes antes de enviar
      const payload = {
        taskId: task.id,
        applicantId: user.id,
        message: applicationData.message.trim(),
        portfolioUrl: applicationData.portfolioUrl.trim() || null,
        walletAddress: applicationData.walletAddress.trim()
      };


      const response = await axios.post(`${API_URL}/auth/apply_task.php`, payload);

      if (response.data && response.data.message) {
        setSubmitMessage(response.data.message);
        setApplicationData({
          message: '',
          portfolioUrl: '',
          walletAddress: ''
        });
        setShowSuccessPopup(true);
      } else {
        setSubmitError('Respuesta inesperada al enviar la aplicación.');
        setShowErrorPopup(true);
      }

    } catch (err: any) {
      
      // Mostrar mensaje de error más detallado
      let errorMessage = 'Error al enviar la aplicación.';
      if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.received_data) {
          errorMessage = `Error: ${JSON.stringify(err.response.data)}`;
        } else {
          errorMessage = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setSubmitError(errorMessage);
      setShowErrorPopup(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Función para manejar el popup de éxito
  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    // Redirigir al dashboard
    window.location.href = '/dashboard';
  };

  // Función para manejar el popup de error
  const handleErrorPopupClose = () => {
    setShowErrorPopup(false);
  };

  if (loading) {
    return <div className="apply-task-container">Cargando detalles de la tarea...</div>;
  }

  if (error) {
    return <div className="apply-task-container error-message">Error: {error}</div>;
  }

  if (!task) {
      return <div className="apply-task-container">No se encontró la tarea.</div>;
  }

  return (
    <div className="apply-task-container">
       <Link to="/dashboard" className="back-button">
         <FaArrowLeft />
         <span>Volver al Dashboard</span>
       </Link>

      <div className="apply-task-content">
        <div className="task-details-card">
          <div className="task-header">
            <h2>{task.title}</h2>
            {task.subtitle && <p className="task-subtitle">{task.subtitle}</p>}
            <span className={`task-difficulty ${task.difficulty.toLowerCase()}`}>
              {task.difficulty}
            </span>
          </div>
          
          <p className="task-description-full">{task.description}</p>

          <div className="task-meta">
             <div className="meta-item">
               <span className="meta-label">Categoría:</span>
               <span className="meta-value">{task.category}</span>
             </div>
             <div className="meta-item">
               <span className="meta-label">Recompensa:</span>
               <span className="meta-value" title="Recibirás exactamente este monto al completar la tarea">
                 {parseFloat(task.price).toFixed(2)} {task.currency}
               </span>
             </div>
             <div className="meta-item">
               <span className="meta-label">Creador:</span>
               <span className="meta-value">{task.creator_username}</span>
             </div>
             <div className="meta-item">
               <span className="meta-label">Publicada:</span>
               <span className="meta-value">{new Date(task.created_at).toLocaleDateString()}</span>
             </div>
          </div>
        </div>

        <div className="application-form-card">
          <h3>Aplicar a esta Tarea</h3>
           {submitMessage && <div className="success-message">{submitMessage}</div>}
           {submitError && <div className="error-message">{submitError}</div>}
          <form onSubmit={handleApplicationSubmit} className="application-form">
            <div className="form-group">
              <label htmlFor="applicationMessage">
                Tu Mensaje / Carta de Presentación *
              </label>
              <textarea
                id="applicationMessage"
                value={applicationData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={6}
                placeholder="Explica por qué eres el candidato ideal para esta tarea..."
                required
              ></textarea>
            </div>
            
            <div className="form-group">
              <label htmlFor="portfolioUrl">
                Enlace a Portafolio o CV (Opcional)
              </label>
              <input
                type="url"
                id="portfolioUrl"
                value={applicationData.portfolioUrl}
                onChange={(e) => handleInputChange('portfolioUrl', e.target.value)}
                placeholder="https://tu-portfolio.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="walletAddress">
                Dirección de Wallet Stellar (Freighter) *
              </label>
              <input
                type="text"
                id="walletAddress"
                value={applicationData.walletAddress}
                onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                placeholder="G..."
                required
              />
            </div>

            <div className="form-info">
              <h4> Información Importante</h4>
              <ul>
                <li>Una vez que el cliente acepte tu propuesta, se creará un contrato inteligente</li>
                <li>El pago se liberará automáticamente al completar la tarea</li>
                <li>Tu dirección de wallet debe ser válida para recibir {task.currency}</li>
              </ul>
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Enviando Aplicación...' : 'Enviar Aplicación'}
            </button>
          </form>
        </div>

      </div>

      {/* Popup de Éxito */}
      {showSuccessPopup && (
        <div className="popup-overlay">
          <div className="popup success-popup">
            <div className="popup-icon"></div>
            <h3>¡Aplicación Enviada Exitosamente!</h3>
            <p>Tu propuesta ha sido enviada correctamente. El cliente revisará tu aplicación y te contactará si eres seleccionado.</p>
            <button onClick={handleSuccessPopupClose} className="popup-button success-button">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Popup de Error */}
      {showErrorPopup && (
        <div className="popup-overlay">
          <div className="popup error-popup">
            <div className="popup-icon"></div>
            <h3>Error al Enviar Aplicación</h3>
            <p>{submitError}</p>
            <button onClick={handleErrorPopupClose} className="popup-button error-button">
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ApplyTask; 