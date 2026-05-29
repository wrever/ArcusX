import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaClock, FaExclamationTriangle, FaCheckCircle, FaFileAlt, FaCreditCard, FaHeading, FaAlignLeft, FaDollarSign, FaTag, FaLayerGroup, FaInfoCircle } from 'react-icons/fa';
import '../css/CreateTask.css';
import axios from '../config/axios';
import Popup from './Popup';
import { arcusxApiUrl } from '../config/arcusxApi';
import { getPlatformFee } from '../services/platformFeeService';
import { useI18n } from '../i18n/I18nProvider';

interface UserLimits {
  can_create: boolean;
  cooldown_remaining: number;
  tasks_today: number;
  tasks_this_week: number;
  next_task_time: string;
}

interface CreateTaskProps {
  embedded?: boolean;
}

interface HireContext {
  userId: number;
  username: string;
  skill?: string;
}

/** Sugiere categoría de tarea en base a la primera skill del freelancer (valores backend: Desarrollo, …). */
function suggestCategoryFromSkill(skill: string | undefined): string {
  if (!skill?.trim()) return 'Desarrollo';
  const s = skill.toLowerCase();
  if (/figma|diseño|design|ui|ux|photoshop|illustrator|marca|vector|grafic|sketch|canva/i.test(s)) return 'Diseño';
  if (/seo|social|ads|marketing|growth|campaign|email|community/i.test(s)) return 'Marketing';
  if (/stellar|blockchain|web3|solidity|smart|bitcoin|ethereum|defi|nft|rust|soroban/i.test(s)) return 'Blockchain';
  if (/writing|copy|blog|video|content|editorial|redacción|redacao/i.test(s)) return 'Contenido';
  if (/react|node|php|python|java|dev|api|sql|mongo|web|typescript|javascript|laravel|docker|aws|linux|git/i.test(s)) {
    return 'Desarrollo';
  }
  return 'Desarrollo';
}

const CreateTask = ({ embedded = false }: CreateTaskProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();

  const hireContextFromQuery = useMemo((): HireContext | null => {
    const uid = searchParams.get('for_user');
    const uname = searchParams.get('hire_username');
    const skillRaw = searchParams.get('hire_skill');
    if (!uid || !uname) return null;
    const id = parseInt(uid, 10);
    if (Number.isNaN(id) || id <= 0) return null;
    try {
      const username = decodeURIComponent(uname);
      const skill = skillRaw ? decodeURIComponent(skillRaw) : undefined;
      return { userId: id, username, skill };
    } catch {
      return null;
    }
  }, [searchParams]);

  const stateHire = (location.state as { hireContext?: HireContext } | null)?.hireContext ?? null;
  const hireContext = stateHire ?? hireContextFromQuery;

  const initialCategory = suggestCategoryFromSkill(hireContext?.skill);
  const initialDescription = hireContext
    ? t('hire.context.desc.prefix').replace('{{username}}', hireContext.username)
    : '';

  const [formData, setFormData] = useState({
    title: '',
    description: initialDescription,
    price: '',
    currency: 'USDC',
    difficulty: 'Fácil',
    category: initialCategory,
    subtitle: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null);
  
  // Estados para monto del trabajador, comisión y total a pagar
  const [workerAmount, setWorkerAmount] = useState<string>('');
  const [commissionAmount, setCommissionAmount] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [platformFee, setPlatformFee] = useState<number>(0.03); // 3% por defecto
  const [platformFeePercent, setPlatformFeePercent] = useState<string>('0.3');
  
  // Estados para el popup
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState<'success' | 'error'>('success');
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  /** URL absoluta a postular (con ?ref=hire); null si no hay task_id. */
  const [postCreateApplyUrl, setPostCreateApplyUrl] = useState<string | null>(null);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState<'success' | 'error' | null>(null);

  // Obtener el usuario logeado
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Función para cargar límites del usuario
  const loadUserLimits = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axios.get(`${arcusxApiUrl('task_stats')}?user_id=${user.id}`);
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

  // Cargar límites del usuario y platform fee al montar el componente
  useEffect(() => {
    loadUserLimits();
    loadPlatformFee();
    
    // Recargar límites cada 30 segundos para mantener actualizado el cooldown
    const interval = setInterval(() => {
      loadUserLimits();
      loadPlatformFee();
    }, 30000); // 30 segundos
    
    // Recargar límites cuando el usuario regrese a la pestaña
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUserLimits();
        loadPlatformFee();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  // Función para cargar platform fee del backend
  const loadPlatformFee = async () => {
    try {
      const fee = await getPlatformFee();
      setPlatformFee(fee);
      setPlatformFeePercent((fee * 100).toFixed(2));
    } catch (error) {
      // Mantener valores por defecto si falla
    }
  };

  // Calcular comisión y total a pagar en tiempo real cuando cambia el precio o el fee
  useEffect(() => {
    if (formData.price && formData.price.trim() !== '') {
      const workerAmountValue = parseFloat(formData.price);
      if (!isNaN(workerAmountValue) && workerAmountValue > 0) {
        // IMPORTANTE: Usar la misma fórmula que en ProposalReview
        // Trustless Work calcula la comisión sobre el amount del escrow al liberar
        // Para que el trabajador reciba exactamente workerAmount:
        // escrowAmount = workerAmount / (1 - platformFee)
        // commission = escrowAmount - workerAmount
        const escrowAmount = workerAmountValue / (1 - platformFee);
        const commission = escrowAmount - workerAmountValue;
        const total = escrowAmount; // Total que debe pagar el cliente
        
        setWorkerAmount(workerAmountValue.toFixed(2));
        setCommissionAmount(commission.toFixed(7));
        setTotalAmount(total.toFixed(7));
      } else {
        setWorkerAmount('');
        setCommissionAmount('');
        setTotalAmount('');
      }
    } else {
      setWorkerAmount('');
      setCommissionAmount('');
      setTotalAmount('');
    }
  }, [formData.price, platformFee]);

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
    setCopyLinkFeedback(null);
    setPopupType('success');
    setPopupTitle(title);
    setPopupMessage(message);
    setShowPopup(true);
  };

  // Función para mostrar popup de error
  const showErrorPopup = (title: string, message: string) => {
    setPostCreateApplyUrl(null);
    setCopyLinkFeedback(null);
    setPopupType('error');
    setPopupTitle(title);
    setPopupMessage(message);
    setShowPopup(true);
  };

  // Función para cerrar popup
  const closePopup = () => {
    setShowPopup(false);
    setPostCreateApplyUrl(null);
    setCopyLinkFeedback(null);
  };

  const handleCopyApplyLink = useCallback(async () => {
    if (!postCreateApplyUrl) return;
    try {
      await navigator.clipboard.writeText(postCreateApplyUrl);
      setCopyLinkFeedback('success');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = postCreateApplyUrl;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopyLinkFeedback('success');
      } catch {
        setCopyLinkFeedback('error');
      }
    }
    window.setTimeout(() => setCopyLinkFeedback(null), 2800);
  }, [postCreateApplyUrl]);

  // Función para manejar el botón del popup
  const handlePopupButton = () => {
    if (popupType === 'success') {
      setPostCreateApplyUrl(null);
      setCopyLinkFeedback(null);
      navigate('/dashboard');
    } else {
      closePopup();
    }
  };

  const applyCreatedTaskSuccess = (data: { task_id?: number | string; message?: string }) => {
    const raw = data?.task_id;
    const taskId = raw != null && raw !== '' ? Number(raw) : NaN;
    const applyUrl =
      !Number.isNaN(taskId) && taskId > 0
        ? `${window.location.origin}/apply-task/${taskId}?ref=hire`
        : null;
    setPostCreateApplyUrl(applyUrl);

    const baseMsg = t('create.task.created.message');
    const shareHint = hireContext
      ? t('hire.success.share.hint').replace(/\{\{username\}\}/g, hireContext.username)
      : t('create.success.share.hint');
    showSuccessPopup(t('create.task.created.title'), `${baseMsg}\n\n${shareHint}`);

    setFormData({
      title: '',
      description: hireContext
        ? t('hire.context.desc.prefix').replace('{{username}}', hireContext.username)
        : '',
      price: '',
      currency: 'USDC',
      difficulty: 'Fácil',
      category: suggestCategoryFromSkill(hireContext?.skill),
      subtitle: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validar que el usuario está logeado
    if (!user || !user.id) {
      showErrorPopup(t('common.error'), t('create.task.error.auth'));
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
      const response = await axios.post(`${arcusxApiUrl('create_task')}`, {
        ...formData,
        user_id: user.id,
        ...(hireContext
          ? { is_private_invite: 1, invited_user_id: hireContext.userId }
          : {}),
      });

      // Verificar si la respuesta es exitosa (200-299) o si tiene el mensaje de éxito
      if (response.status >= 200 && response.status < 300 && response.data?.success && response.data?.message) {
        applyCreatedTaskSuccess(response.data);
        
        // Recargar límites del usuario (con manejo de errores)
        try {
          const limitsResponse = await axios.get(`${arcusxApiUrl('task_stats')}?user_id=${user.id}`);
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
        showErrorPopup(t('common.error'), t('create.task.error.server'));
      }

    } catch (err: any) {
      // Si el error es 201 (Created), la tarea se creó exitosamente
      if (err.response && err.response.status === 201 && err.response.data?.success) {
        applyCreatedTaskSuccess(err.response.data);
        
        // Recargar límites
        try {
          await loadUserLimits();
        } catch (e) {
        }
      } else {
        showErrorPopup(t('common.error'), err.response?.data?.message || t('create.task.error.create'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`create-task-container ${embedded ? 'create-task-container--embedded' : ''}`}>
      {!embedded && (
        <Link to="/dashboard" className="back-button">
          <FaArrowLeft />
          <span>{t('create.back')}</span>
        </Link>
      )}

      <div className="create-task-form-card">
        <h2>{t('create.title')}</h2>

        {/* Contexto de contratación rápida */}
        {hireContext && (
          <div className="hire-context-chip">
            <span className="hire-context-chip-dot" />
            {t('hire.context.chip').replace('{{username}}', hireContext.username)}
          </div>
        )}
        {hireContext && (
          <p className="hire-context-private-hint" style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.9 }}>
            {t('hire.context.private').replace(/\{\{username\}\}/g, hireContext.username)}
          </p>
        )}

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
              <span>{t('create.loading.limits')}</span>
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
                  {userLimits.cooldown_remaining > 0 ? t('create.limit.cooldown.title') : t('create.limit.reached.title')}
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
                    <p>{t('create.limit.cooldown')} <strong className="highlight-time">{formatTime(userLimits.cooldown_remaining)}</strong> {t('create.limit.to.create')}</p>
                  </div>
                  <div className="next-task-info">
                    <FaCheckCircle className="info-icon" />
                    <span>{t('create.next.task.available')} <strong>{userLimits.next_task_time}</strong></span>
                  </div>
                </>
              ) : (
                <>
                  <div className="warning-message">
                    <p>{t('create.limit.reached')}</p>
                  </div>
                  <div className="limits-stats">
                    <div className="limit-stat-item">
                      <span className="limit-label">{t('create.tasks.today')}</span>
                      <span className="limit-value">{userLimits.tasks_today}/5</span>
                    </div>
                    <div className="limit-stat-item">
                      <span className="limit-label">{t('create.tasks.week')}</span>
                      <span className="limit-value">{userLimits.tasks_this_week}/50</span>
                    </div>
                  </div>
                  <p className="limit-hint">{t('create.limit.hint')}</p>
                </>
              )}
            </div>
          </div>
        )}


        <form onSubmit={handleSubmit} className="create-task-form">
          {/* Información básica */}
          <div className="form-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaFileAlt /> {t('create.section.basic')}
            </h3>
            
            <div className="form-group">
              <label htmlFor="title">
                <FaHeading style={{ marginRight: '6px', fontSize: '14px' }} />
                {t('create.label.title')}
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={t('create.task.placeholder.title')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="subtitle">
                <FaHeading style={{ marginRight: '6px', fontSize: '14px' }} />
                {t('create.label.subtitle')}
              </label>
              <input
                type="text"
                id="subtitle"
                name="subtitle"
                value={formData.subtitle}
                onChange={handleChange}
                placeholder={t('create.task.placeholder.subtitle')}
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                <FaAlignLeft style={{ marginRight: '6px', fontSize: '14px' }} />
                {t('create.label.description')}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t('create.task.placeholder.description')}
                rows={4}
                required
              />
            </div>

          </div>

          {/* Presupuesto y categorización */}
          <div className="form-section">
            <h3> {t('create.section.budget')}</h3>
            
            {/* Información del precio - Arriba del campo */}
            {formData.price && workerAmount && commissionAmount && totalAmount && (
              <div className="net-amount-display">
                <p className="net-amount-text">
                   {t('create.worker.receives')} <strong>{workerAmount} USDC</strong>
                </p>
                <p className="commission-text">
                   {t('create.commission.label')} ({platformFeePercent}%): {commissionAmount} USDC
                </p>
                <p className="total-amount-text" style={{ fontWeight: 'bold', color: '#10dd88', fontSize: '1.1em' }}>
                  <FaCreditCard style={{ marginRight: '6px' }} /> {t('create.total.pay')} <strong>{totalAmount} USDC</strong>
                </p>
                <p className="contract-cost-text">
                   {t('create.note.xlm')}
                </p>
              </div>
            )}
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">
                  <FaDollarSign style={{ marginRight: '6px', fontSize: '14px' }} />
                  {t('create.label.payment')}
                </label>
                <p className="helper-text" style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                  <FaInfoCircle style={{ marginRight: '4px', fontSize: '12px' }} />
                  {t('create.helper.payment').replace('{{p}}', String(platformFeePercent))}
                </p>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder={t('create.placeholder.price')}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="currency">
                  <FaCreditCard style={{ marginRight: '6px', fontSize: '14px' }} />
                  {t('create.label.currency')}
                </label>
                <input
                  type="text"
                  id="currency"
                  name="currency"
                  value="USDC"
                  readOnly
                  disabled
                  className="currency-readonly"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">
                  <FaTag style={{ marginRight: '6px', fontSize: '14px' }} />
                  {t('create.label.category')}
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="Desarrollo">{t('dashboard.tasks.category.development')}</option>
                  <option value="Diseño">{t('dashboard.tasks.category.design')}</option>
                  <option value="Marketing">{t('dashboard.tasks.category.marketing')}</option>
                  <option value="Blockchain">{t('dashboard.tasks.category.blockchain')}</option>
                  <option value="Contenido">{t('dashboard.tasks.category.content')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">
                  <FaLayerGroup style={{ marginRight: '6px', fontSize: '14px' }} />
                  {t('create.label.difficulty')}
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  required
                >
                  <option value="Fácil">{t('dashboard.tasks.difficulty.easy')}</option>
                  <option value="Intermedio">{t('dashboard.tasks.difficulty.medium')}</option>
                  <option value="Difícil">{t('dashboard.tasks.difficulty.hard')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="form-section">
            <h3> {t('create.section.extra')}</h3>
            <div className="info-box">
              <p><strong>{t('create.how.title')}</strong></p>
              <ul>
                <li>{t('create.bullet1')}</li>
                <li>{t('create.bullet2')}</li>
                <li>{t('create.bullet.escrow')}</li>
                <li>{t('create.bullet3')}</li>
                <li>{t('create.bullet4')}</li>
              </ul>
              <p style={{ marginTop: '1rem' }}><strong> {t('create.costs.title')}</strong></p>
              <ul>
                <li>{t('create.costs.bullet.worker')}</li>
                <li>{t('create.costs.bullet.commission').replace('{{p}}', String(platformFeePercent))}</li>
                <li>{t('create.costs.bullet.currency')}</li>
                <li>{t('create.costs.bullet.total').replace('{{p}}', String(platformFeePercent))}</li>
                <li>{t('create.costs.bullet.fees')}</li>
                <li>{t('create.costs.bullet.note')}</li>
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
              {loading ? t('create.submitting') : 
               (userLimits && userLimits.can_create === false) ? t('create.limit.reached.title') :
               t('create.publish')}
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
        buttonText={popupType === 'success' ? t('create.popup.ok') : t('create.popup.dismiss')}
        onButtonClick={handlePopupButton}
        children={
          popupType === 'success' && postCreateApplyUrl ? (
            <div className="hire-success-extras">
              <label className="hire-success-label" htmlFor="hire-apply-url">
                {t('create.success.apply.link.label')}
              </label>
              <div className="hire-success-url-row">
                <input
                  id="hire-apply-url"
                  readOnly
                  className="hire-success-url-input"
                  value={postCreateApplyUrl}
                  onFocus={(e) => e.target.select()}
                />
                <button type="button" className="hire-success-copy-btn" onClick={handleCopyApplyLink}>
                  {t('create.success.copy.button')}
                </button>
              </div>
              {copyLinkFeedback === 'success' && (
                <p className="hire-copy-feedback hire-copy-feedback--ok">{t('create.success.copy.done')}</p>
              )}
              {copyLinkFeedback === 'error' && (
                <p className="hire-copy-feedback hire-copy-feedback--err">{t('create.success.copy.fail')}</p>
              )}
            </div>
          ) : undefined
        }
      />
    </div>
  );
};

export default CreateTask;