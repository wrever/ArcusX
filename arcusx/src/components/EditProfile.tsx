import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaEnvelope, FaLock, FaSave, FaTimes, FaUpload, FaGlobe, FaUnlock, FaLock as FaLockIcon, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config/database';
import { getUserProfile, updateUserProfile, uploadAvatar, getPortfolio, addPortfolioItem, updatePortfolioItem, deletePortfolioItem } from '../services/profileService';
import type { UserProfile, PortfolioItem, CreatePortfolioItemData } from '../types/profile';
import '../css/EditProfile.css';

interface StoredUser {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
}

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<StoredUser | null>(null);
  const [, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Datos de cuenta
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Datos de perfil público
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [publicProfile, setPublicProfile] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Portfolio
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioItem | null>(null);
  const [portfolioForm, setPortfolioForm] = useState<CreatePortfolioItemData>({
    title: '',
    description: '',
    image_url: '',
    project_url: '',
    category: 'Otros'
  });

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar datos del usuario y perfil
  useEffect(() => {
    const loadData = async () => {
      const stored = localStorage.getItem('user');
      if (!stored) {
        navigate('/login');
        return;
      }
      
      try {
        const parsed = JSON.parse(stored);
        if (!parsed?.id) {
          navigate('/login');
          return;
        }
        
        const u: StoredUser = {
          id: parsed.id,
          username: parsed.username || '',
          email: parsed.email || '',
          avatar_url: parsed.avatar_url || null
        };
        setUser(u);
        setName(u.username);
        setEmail(u.email);
        setAvatarUrl(u.avatar_url || null);
        
        // Cargar perfil completo
        try {
          const profileData = await getUserProfile(parsed.id);
          setProfile(profileData);
          setBio(profileData.bio || '');
          setPortfolioUrl(profileData.portfolio_url || '');
          setPublicProfile(profileData.public_profile);
          setAvatarUrl(profileData.avatar_url || null);
          
          // Cargar portfolio
          try {
            const portfolioData = await getPortfolio(parsed.id);
            setPortfolio(portfolioData);
          } catch (e) {
            setPortfolio([]);
          }
        } catch (e) {
          // Si falla, usar datos básicos del localStorage
        }
      } catch (e) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      setError('Solo se permiten imágenes JPG, PNG o WEBP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Tamaño máximo: 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      setError(null);
      
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
      
      // Actualizar localStorage
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.avatar_url = url;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      
      setSuccess('Avatar actualizado correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al subir avatar');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSuccess(null);

    if (!name || !email) {
      setError('El nombre y el correo electrónico son obligatorios.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    try {
      setSaving(true);
      
      // 1. Actualizar datos de cuenta (username, email, password)
      await axios.post(`${API_URL}/auth/update_user.php`, {
        id: user.id,
        name,
        email,
        currentPassword,
        newPassword
      });

      // 2. Actualizar perfil público (bio, portfolio_url, public_profile)
      await updateUserProfile({
        bio: bio.trim() || undefined,
        portfolio_url: portfolioUrl.trim() || undefined,
        public_profile: publicProfile
      });

      // Actualizar localStorage
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.username = name;
        parsed.email = email;
        if (avatarUrl) parsed.avatar_url = avatarUrl;
        localStorage.setItem('user', JSON.stringify(parsed));
      }

      setSuccess('¡Perfil actualizado correctamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setSuccess(null);
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Error al guardar los cambios.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Portfolio handlers
  const handleAddPortfolioItem = async () => {
    if (!portfolioForm.title.trim()) {
      setError('El título es requerido');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const id = await addPortfolioItem(portfolioForm);
      const newItem: PortfolioItem = {
        id,
        ...portfolioForm,
        category: portfolioForm.category || '',
        created_at: new Date().toISOString()
      };
      
      setPortfolio(prev => [...prev, newItem]);
      setPortfolioForm({
        title: '',
        description: '',
        image_url: '',
        project_url: '',
        category: 'Otros'
      });
      setShowPortfolioForm(false);
      setSuccess('Item agregado al portfolio');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al agregar item');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePortfolioItem = async () => {
    if (!editingPortfolioItem || !portfolioForm.title.trim()) {
      setError('El título es requerido');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await updatePortfolioItem({
        id: editingPortfolioItem.id,
        ...portfolioForm
      });
      
      setPortfolio(prev => prev.map(item => 
        item.id === editingPortfolioItem.id 
          ? { ...item, ...portfolioForm }
          : item
      ));
      
      setEditingPortfolioItem(null);
      setPortfolioForm({
        title: '',
        description: '',
        image_url: '',
        project_url: '',
        category: 'Otros'
      });
      setShowPortfolioForm(false);
      setSuccess('Item actualizado correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePortfolioItem = async (itemId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este item del portfolio?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await deletePortfolioItem(itemId);
      setPortfolio(prev => prev.filter(item => item.id !== itemId));
      setSuccess('Item eliminado correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar item');
    } finally {
      setSaving(false);
    }
  };

  const startEditPortfolioItem = (item: PortfolioItem) => {
    setEditingPortfolioItem(item);
    setPortfolioForm({
      title: item.title,
      description: item.description || '',
      image_url: item.image_url || '',
      project_url: item.project_url || '',
      category: item.category
    });
    setShowPortfolioForm(true);
  };

  if (loading || !user) {
    return (
      <div className="edit-profile-page">
        <div className="edit-profile-loading">
          <div className="spinner" />
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-header">
        <button
          className="edit-profile-back"
          onClick={() => navigate('/dashboard')}
          type="button"
        >
          <FaArrowLeft />
          <span>Volver al Dashboard</span>
        </button>
      </div>

      <div className="edit-profile-card">
        <div className="edit-profile-card-header">
          <div className="avatar-section">
            {avatarUrl ? (
              <img 
                src={`${API_URL.replace('/api', '')}${avatarUrl}`} 
                alt="Avatar" 
                className="avatar-image"
              />
            ) : (
              <div className="avatar-circle">
                <span>{user.username?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              <FaUpload />
              {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
            </button>
          </div>
          <div className="title-block">
            <h1>Editar perfil</h1>
            <p>Actualiza tu información básica, perfil público y portfolio.</p>
          </div>
        </div>

        {error && <div className="edit-profile-alert error">{error}</div>}
        {success && <div className="edit-profile-alert success">{success}</div>}

        <form className="edit-profile-form" onSubmit={handleSubmit}>
          {/* Sección 1: Información básica */}
          <div className="form-section">
            <h2>Información básica</h2>

            <div className="form-group">
              <label htmlFor="name">
                <FaUser /> Nombre de usuario
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                minLength={3}
                maxLength={50}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <FaEnvelope /> Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Sección 2: Perfil público */}
          <div className="form-section">
            <h2>Perfil público</h2>
            <p className="section-help">
              Esta información será visible para otros usuarios si tu perfil es público.
            </p>

            <div className="form-group">
              <label htmlFor="bio">Biografía</label>
              <textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Cuéntanos sobre ti..."
              />
              <span className="char-count">{bio.length}/1000</span>
            </div>

            <div className="form-group">
              <label htmlFor="portfolioUrl">
                <FaGlobe /> URL de Portfolio
              </label>
              <input
                id="portfolioUrl"
                type="url"
                value={portfolioUrl}
                onChange={e => setPortfolioUrl(e.target.value)}
                placeholder="https://tu-portfolio.com"
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={e => setPublicProfile(e.target.checked)}
                />
                <span className="checkbox-custom">
                  {publicProfile ? <FaUnlock /> : <FaLockIcon />}
                </span>
                <div className="checkbox-text">
                  <strong>Perfil Público</strong>
                  <p>Permitir que otros usuarios vean tu perfil y estadísticas</p>
                </div>
              </label>
            </div>
          </div>

          {/* Sección 3: Portfolio */}
          <div className="form-section">
            <h2>Portfolio</h2>
            
            {portfolio.length > 0 && (
              <div className="portfolio-list">
                {portfolio.map((item) => (
                  <div key={item.id} className="portfolio-item-card">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.title} className="portfolio-item-image" />
                    )}
                    <div className="portfolio-item-content">
                      <h3>{item.title}</h3>
                      {item.description && <p>{item.description}</p>}
                      {item.project_url && (
                        <a href={item.project_url} target="_blank" rel="noopener noreferrer">
                          <FaGlobe /> Ver Proyecto
                        </a>
                      )}
                      <span className="portfolio-category">{item.category}</span>
                    </div>
                    <div className="portfolio-item-actions">
                      <button
                        type="button"
                        onClick={() => startEditPortfolioItem(item)}
                        className="edit-button"
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePortfolioItem(item.id)}
                        className="delete-button"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showPortfolioForm ? (
              <div className="portfolio-form">
                <h3>{editingPortfolioItem ? 'Editar Item' : 'Agregar Item'}</h3>
                <div className="form-group">
                  <label>Título *</label>
                  <input
                    type="text"
                    value={portfolioForm.title}
                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={portfolioForm.description}
                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>URL de Imagen</label>
                  <input
                    type="url"
                    value={portfolioForm.image_url}
                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>
                <div className="form-group">
                  <label>URL del Proyecto</label>
                  <input
                    type="url"
                    value={portfolioForm.project_url}
                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, project_url: e.target.value }))}
                    placeholder="https://ejemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={portfolioForm.category}
                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Desarrollo">Desarrollo</option>
                    <option value="Diseño">Diseño</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Blockchain">Blockchain</option>
                    <option value="Contenido">Contenido</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div className="portfolio-form-actions">
                  <button
                    type="button"
                    onClick={editingPortfolioItem ? handleUpdatePortfolioItem : handleAddPortfolioItem}
                    className="btn-primary"
                    disabled={saving}
                  >
                    {editingPortfolioItem ? 'Actualizar' : 'Agregar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPortfolioForm(false);
                      setEditingPortfolioItem(null);
                      setPortfolioForm({
                        title: '',
                        description: '',
                        image_url: '',
                        project_url: '',
                        category: 'Otros'
                      });
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPortfolioForm(true)}
                className="add-portfolio-button"
              >
                <FaPlus />
                Agregar Item al Portfolio
              </button>
            )}
          </div>

          {/* Sección 4: Seguridad */}
          <div className="form-section">
            <h2>Seguridad</h2>
            <p className="section-help">
              Solo necesitas rellenar estos campos si quieres cambiar tu contraseña.
            </p>

            <div className="form-group">
              <label htmlFor="currentPassword">
                <FaLock /> Contraseña actual
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Introduce tu contraseña actual"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newPassword">
                  <FaLock /> Nueva contraseña
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Dejar vacío si no quieres cambiarla"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <FaLock /> Confirmar nueva contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                />
              </div>
            </div>
          </div>

          <div className="edit-profile-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              <FaTimes />
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              <FaSave />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
