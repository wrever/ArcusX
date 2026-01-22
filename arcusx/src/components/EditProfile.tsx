import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaEnvelope, FaLock, FaSave, FaTimes, FaUpload, FaGlobe, FaUnlock, FaLock as FaLockIcon } from 'react-icons/fa';
import { getUserProfile, updateUserProfile, updateUserBasicData, uploadAvatar } from '../services/profileService';
import type { UserProfile, Skill } from '../types/profile';
import { getAvatarUrl } from '../utils/avatarUtils';
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
  
  // Habilidades
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  
  // Lista de habilidades disponibles
  const availableSkills = [
    'JavaScript', 'TypeScript', 'Python', 'PHP', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'Ruby', 'Swift', 'Kotlin', 'Dart', 'HTML', 'CSS', 'SCSS', 'SASS', 'React',
    'Vue.js', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask',
    'Laravel', 'Spring', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'GraphQL',
    'REST API', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'Linux',
    'UI/UX Design', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Blockchain',
    'Solidity', 'Web3', 'Smart Contracts', 'Stellar', 'Ethereum', 'Bitcoin'
  ];

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
          
          // Cargar habilidades
          setSelectedSkills(profileData.skills || []);
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
      await updateUserBasicData({
        id: user.id,
        name,
        email,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      });

      // 2. Actualizar perfil público (bio, portfolio_url, public_profile, skills)
      await updateUserProfile({
        bio: bio.trim() || undefined,
        portfolio_url: portfolioUrl.trim() || undefined,
        public_profile: publicProfile,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined
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

  // Handlers de habilidades
  const handleToggleSkill = (skillName: string) => {
    setSelectedSkills(prev => {
      const existing = prev.find(s => s.name === skillName);
      if (existing) {
        // Si ya existe, eliminarlo
        return prev.filter(s => s.name !== skillName);
      } else {
        // Si no existe, agregarlo con nivel beginner por defecto
        return [...prev, { name: skillName, level: 'beginner' }];
      }
    });
  };

  const handleSkillLevelChange = (skillName: string, level: Skill['level']) => {
    setSelectedSkills(prev =>
      prev.map(skill =>
        skill.name === skillName ? { ...skill, level } : skill
      )
    );
  };

  const isSkillSelected = (skillName: string) => {
    return selectedSkills.some(s => s.name === skillName);
  };

  const getSkillLevel = (skillName: string): Skill['level'] => {
    const skill = selectedSkills.find(s => s.name === skillName);
    return skill?.level || 'beginner';
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
                src={getAvatarUrl(avatarUrl)} 
                alt="Avatar" 
                className="avatar-image"
                onError={(e) => {
                  // Si la imagen falla, mostrar placeholder
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const placeholder = target.nextElementSibling as HTMLElement;
                  if (placeholder && placeholder.classList.contains('avatar-circle')) {
                    placeholder.style.display = 'flex';
                  }
                }}
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
            <p>Actualiza tu información básica, perfil público y habilidades.</p>
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
              <div className="checkbox-label">
                <button
                  type="button"
                  className={`checkbox-custom ${publicProfile ? 'public' : 'private'}`}
                  onClick={() => setPublicProfile(!publicProfile)}
                  aria-label={publicProfile ? "Hacer perfil privado" : "Hacer perfil público"}
                >
                  {publicProfile ? <FaUnlock /> : <FaLockIcon />}
                </button>
                <div className="checkbox-text">
                  <strong>Perfil Público</strong>
                  <p>Permitir que otros usuarios vean tu perfil y estadísticas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Habilidades */}
          <div className="form-section">
            <h2>Habilidades</h2>
            <p className="section-help">
              Selecciona las habilidades que dominas. Puedes ajustar el nivel de cada una.
            </p>

            <div className="skills-selection">
              <div className="skills-grid">
                {availableSkills.map((skill) => {
                  const isSelected = isSkillSelected(skill);
                  const level = getSkillLevel(skill);
                  
                  return (
                    <div key={skill} className={`skill-select-item ${isSelected ? 'selected' : ''}`}>
                      <label className="skill-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSkill(skill)}
                        />
                        <span className="skill-name">{skill}</span>
                      </label>
                      {isSelected && (
                        <select
                          className="skill-level-select"
                          value={level}
                          onChange={(e) => handleSkillLevelChange(skill, e.target.value as Skill['level'])}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="beginner">Principiante</option>
                          <option value="intermediate">Intermedio</option>
                          <option value="advanced">Avanzado</option>
                          <option value="expert">Experto</option>
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {selectedSkills.length > 0 && (
                <div className="selected-skills-summary">
                  <h3>Habilidades seleccionadas ({selectedSkills.length})</h3>
                  <div className="selected-skills-list">
                    {selectedSkills.map((skill, index) => (
                      <div key={index} className="selected-skill-badge">
                        <span className="skill-name">{skill.name}</span>
                        <span className="skill-level-badge">{skill.level}</span>
                        <button
                          type="button"
                          className="remove-skill-btn"
                          onClick={() => handleToggleSkill(skill.name)}
                          title="Eliminar habilidad"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
