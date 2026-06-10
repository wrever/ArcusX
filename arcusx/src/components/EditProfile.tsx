import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaEnvelope, FaLock, FaSave, FaTimes, FaUpload, FaGlobe, FaUnlock, FaLock as FaLockIcon, FaWallet } from 'react-icons/fa';
import { getUserProfile, updateUserProfile, updateUserBasicData, uploadAvatar } from '../services/profileService';
import { authService } from '../services/authService';
import { useWallet } from '../hooks/useWallet';
import type { UserProfile, Skill } from '../types/profile';
import { getAvatarUrl } from '../utils/avatarUtils';
import {
  consumePostWalletRedirect,
  dashboardTabHref,
  getDefaultDashboardTab,
} from '../config/dashboardTabs';
import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import { useI18n } from '../i18n/I18nProvider';
import '../css/EditProfile.css';

interface StoredUser {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
}

/** Formato cuenta propia Stellar (misma regla que `register_wallet.php`). */
const STELLAR_G_ADDRESS = /^G[A-Z0-9]{55}$/;

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const enterprise = useEnterpriseMode();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { address: connectedWalletAddress, isConnected: walletConnected } = useWallet();

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
  
  // Habilidades agrupadas por categoría
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  
  const skillsByCategory: { categoryKey: string; skills: string[] }[] = [
    {
      categoryKey: 'edit.skills.category.development',
      skills: [
        'JavaScript', 'TypeScript', 'Python', 'PHP', 'Java', 'C++', 'C#', 'Go', 'Rust',
        'Ruby', 'Swift', 'Kotlin', 'Dart', 'Node.js', 'Express', 'Django', 'Flask',
        'Laravel', 'Spring', 'GraphQL', 'REST API', 'Git', 'Linux'
      ]
    },
    {
      categoryKey: 'edit.skills.category.frontend',
      skills: ['HTML', 'CSS', 'SCSS', 'SASS', 'React', 'Vue.js', 'Angular', 'Next.js']
    },
    {
      categoryKey: 'edit.skills.category.databases',
      skills: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis']
    },
    {
      categoryKey: 'edit.skills.category.devops',
      skills: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP']
    },
    {
      categoryKey: 'edit.skills.category.design',
      skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator']
    },
    {
      categoryKey: 'edit.skills.category.blockchain',
      skills: ['Blockchain', 'Solidity', 'Web3', 'Smart Contracts', 'Stellar', 'Ethereum', 'Bitcoin']
    }
  ];

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /** `undefined` = aún no consultado al backend; `null` = sin wallet; string = dirección. */
  const [registeredWallet, setRegisteredWallet] = useState<string | null | undefined>(undefined);
  const [walletInput, setWalletInput] = useState('');
  const [walletVerifyLoading, setWalletVerifyLoading] = useState(false);
  const [walletErrorLocal, setWalletErrorLocal] = useState<string | null>(null);

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

        setWalletVerifyLoading(true);
        setWalletErrorLocal(null);
        try {
          const w = await authService.verifyWallet();
          const payout = w.private_payout_wallet ?? w.wallet_address;
          if (w.success && w.has_wallet && payout) {
            setRegisteredWallet(payout);
            setWalletInput(payout);
          } else {
            setRegisteredWallet(null);
            setWalletInput('');
          }
        } catch {
          setRegisteredWallet(null);
        } finally {
          setWalletVerifyLoading(false);
        }
      } catch (e) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [navigate]);

  useEffect(() => {
    if (window.location.hash === '#private-payout-wallet') {
      const el = document.getElementById('private-payout-wallet');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading]);

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
      setError(err.message || t('edit.error.avatar'));
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

      const walletTrimmed = walletInput.trim();
      if (walletTrimmed) {
        if (!STELLAR_G_ADDRESS.test(walletTrimmed)) {
          setWalletErrorLocal(t('edit.wallet.error.format'));
          setSaving(false);
          return;
        }
        const walletRes = await authService.registerWallet(walletTrimmed);
        if (!walletRes.success) {
          setWalletErrorLocal(walletRes.message || t('edit.wallet.error.generic'));
          setSaving(false);
          return;
        }
        const saved = walletRes.private_payout_wallet ?? walletTrimmed;
        setRegisteredWallet(saved);
        setWalletInput(saved);
      }

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
      
      const walletReturn = consumePostWalletRedirect();
      const returnToOffers =
        !walletReturn && window.location.hash === '#private-payout-wallet';
      setTimeout(() => {
        setSuccess(null);
        if (walletReturn) {
          navigate(walletReturn);
          return;
        }
        navigate(
          returnToOffers
            ? dashboardTabHref('private-offers', enterprise)
            : dashboardTabHref(getDefaultDashboardTab(enterprise), enterprise),
        );
      }, 1500);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('edit.error.save');
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

  const handleUseConnectedWallet = () => {
    setWalletErrorLocal(null);
    if (!walletConnected || !connectedWalletAddress) {
      setWalletErrorLocal(t('edit.wallet.error.connect'));
      return;
    }
    setWalletInput(connectedWalletAddress);
  };

  if (loading || !user) {
    return (
      <div className="edit-profile-page">
        <div className="edit-profile-loading">
          <div className="spinner" />
          <p>{t('common.loading.profile')}</p>
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
          <span>{t('edit.back')}</span>
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
              {uploadingAvatar ? t('edit.uploading') : t('profile.upload.avatar')}
            </button>
          </div>
          <div className="title-block">
            <h1>{t('edit.title')}</h1>
            <p>{t('edit.description')}</p>
          </div>
        </div>

        {error && <div className="edit-profile-alert error">{error}</div>}
        {success && <div className="edit-profile-alert success">{success}</div>}

        <form className="edit-profile-form" onSubmit={handleSubmit}>
          {/* Sección 1: Información básica */}
          <div className="form-section">
            <h2>{t('edit.section.basic')}</h2>

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
            <h2>{t('edit.section.public')}</h2>
            <p className="section-help">
              Esta información será visible para otros usuarios si tu perfil es público.
            </p>

            <div className="form-group">
              <label htmlFor="bio">{t('edit.label.bio')}</label>
              <textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder={t('edit.bio.placeholder')}
              />
              <span className="char-count">{bio.length}/1000</span>
            </div>

            <div className="form-group">
              <label htmlFor="portfolioUrl">
                <FaGlobe /> {t('edit.label.portfolio')}
              </label>
              <input
                id="portfolioUrl"
                type="url"
                value={portfolioUrl}
                onChange={e => setPortfolioUrl(e.target.value)}
                placeholder={t('edit.portfolio.placeholder')}
              />
            </div>

            <div className="form-group checkbox-group">
              <div className="checkbox-label">
                <button
                  type="button"
                  className={`checkbox-custom ${publicProfile ? 'public' : 'private'}`}
                  onClick={() => setPublicProfile(!publicProfile)}
                  aria-label={publicProfile ? t('edit.profile.makePrivate') : t('edit.profile.makePublic')}
                >
                  {publicProfile ? <FaUnlock /> : <FaLockIcon />}
                </button>
                <div className="checkbox-text">
                  <strong>{t('edit.public.label')}</strong>
                  <p>{t('edit.public.desc')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Habilidades */}
          <div className="form-section">
            <h2>{t('edit.section.skills')}</h2>
            <p className="section-help">
              {t('edit.skills.help')}
            </p>

            <div className="skills-selection">
              {skillsByCategory.map((group) => (
                <div key={group.categoryKey} className="skills-category-block">
                  <h3 className="skills-category-title">{t(group.categoryKey)}</h3>
                  <div className="skills-grid">
                    {group.skills.map((skill) => {
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
                              <option value="beginner">{t('edit.skill.beginner')}</option>
                              <option value="intermediate">{t('edit.skill.intermediate')}</option>
                              <option value="advanced">{t('edit.skill.advanced')}</option>
                              <option value="expert">{t('edit.skill.expert')}</option>
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {selectedSkills.length > 0 && (
                <div className="selected-skills-summary">
                  <h3>{t('edit.selected.skills')} ({selectedSkills.length})</h3>
                  <div className="selected-skills-list">
                    {selectedSkills.map((skill, index) => (
                      <div key={index} className="selected-skill-badge">
                        <span className="skill-name">{skill.name}</span>
                        <span className="skill-level-badge">{skill.level}</span>
                        <button
                          type="button"
                          className="remove-skill-btn"
                          onClick={() => handleToggleSkill(skill.name)}
                          title={t('edit.remove.skill')}
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

          {/* Wallet para ofertas privadas */}
          <div className="form-section" id="private-payout-wallet">
            <h2>
              <FaWallet style={{ marginRight: 8, verticalAlign: 'middle' }} aria-hidden />
              {t('edit.section.wallet')}
            </h2>
            <p className="section-help">{t('edit.wallet.help')}</p>
            {walletVerifyLoading ? (
              <p className="section-help">{t('edit.wallet.loading')}</p>
            ) : (
              <>
                {walletErrorLocal ? (
                  <div className="edit-profile-alert error">{walletErrorLocal}</div>
                ) : null}
                {registeredWallet ? (
                  <p className="section-help">{t('edit.wallet.changeHint')}</p>
                ) : null}
                <div className="form-group">
                  <label htmlFor="walletAddress">{t('edit.wallet.fieldLabel')}</label>
                  <input
                    id="walletAddress"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={56}
                    value={walletInput}
                    onChange={e => {
                      setWalletInput(e.target.value);
                      setWalletErrorLocal(null);
                    }}
                    placeholder={t('edit.wallet.placeholder')}
                  />
                </div>
                <div className="form-group edit-profile-wallet-actions">
                  <button type="button" className="btn-secondary" onClick={handleUseConnectedWallet}>
                    {t('edit.wallet.useConnected')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Sección 4: Seguridad */}
          <div className="form-section">
            <h2>{t('edit.section.security')}</h2>
            <p className="section-help">
              {t('edit.security.help')}
            </p>

            <div className="form-group">
              <label htmlFor="currentPassword">
                <FaLock /> {t('edit.password.current.label')}
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder={t('edit.password.current')}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newPassword">
                  <FaLock /> {t('edit.password.new.label')}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t('edit.password.leave.empty')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <FaLock /> {t('edit.password.confirm.label')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('edit.password.repeat')}
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              <FaSave />
              {saving ? t('edit.saving') : t('edit.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
