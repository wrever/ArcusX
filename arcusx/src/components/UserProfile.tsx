import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCheckCircle, FaBriefcase, FaStar, FaDollarSign, FaTasks, FaLock } from 'react-icons/fa';
import { getUserProfile, getUserPublicStats } from '../services/profileService';
import type { UserProfile as UserProfileType, UserStatistics } from '../types/profile';
import RatingDisplay from './RatingDisplay';
import SEO from './SEO';
import { getAvatarUrl, getDefaultAvatarUrl } from '../utils/avatarUtils';
import '../css/UserProfile.css';
import '../css/Preloader.css';
import logoDark from '../images/arcus-logo.png';
import logoLight from '../images/arcusxlogoclaro.png';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n/I18nProvider';

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from;
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const logo = theme === 'light' ? logoLight : logoDark;
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Obtener usuario actual
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isOwner = currentUser && userId && currentUser.id === parseInt(userId);

  useEffect(() => {
    if (!userId) {
      setError(t('profile.error.noUserId'));
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [profileData, statsData] = await Promise.all([
          getUserProfile(parseInt(userId)),
          getUserPublicStats(parseInt(userId))
        ]);
        
        setProfile(profileData);
        setStats(statsData);
      } catch (err: any) {
        setError(err.message || t('profile.error.load'));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, t]);

  const formatDate = (dateString: string) => {
    const locale = lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-BR' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate(-1);
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'var(--primary-green, #10dd88)';
      case 'advanced': return '#0ab86a';
      case 'intermediate': return '#089954';
      default: return '#067a45';
    }
  };

  if (loading) {
    return (
      <div className="preloader">
        <div className="preloader-content">
          <div className="logo">
            <img src={logo} alt="ArcusX Logo" className="logo-image" loading="lazy" decoding="async" />
          </div>
          <div className="loading-circle">
            <div className="circle"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    const isPrivateError = error?.includes('privado') || error?.includes('private');
    return (
      <div className="user-profile-container">
        <div className="error-message">
          <h3>{isPrivateError ? t('profile.private.title') : t('common.error')}</h3>
          <p>{error || t('profile.not.found')}</p>
          <button type="button" onClick={handleBack} className="back-button">
            <FaArrowLeft />
            <span>{t('common.back')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Structured Data para Person (cuando el perfil está disponible)
  const personSchema = profile ? {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.username,
    url: `https://arcusx.pro/profile/${userId}`,
    image: profile.avatar_url ? getAvatarUrl(profile.avatar_url) : getDefaultAvatarUrl(),
    description: profile.bio || `Perfil de ${profile.username} en ArcusX`,
    ...(profile.portfolio_url && {
      sameAs: [profile.portfolio_url]
    })
  } : null;

  return (
    <>
      {profile && (
        <SEO
          title={t('profile.title').replace('{{username}}', profile.username)}
          description={profile.bio || `Perfil público de ${profile.username} en ArcusX. ${stats ? `Rating: ${stats.average_rating}/5, ${stats.tasks_completed} tareas completadas.` : ''}`}
              image={profile.avatar_url ? getAvatarUrl(profile.avatar_url) : getDefaultAvatarUrl()}
          url={`/profile/${userId}`}
          type="profile"
          locale="es"
          structuredData={personSchema || undefined}
        />
      )}
      <div className="user-profile-container">
        {/* Header con botón de volver */}
        <div className="profile-header-nav">
        <button type="button" onClick={handleBack} className="back-button">
          <FaArrowLeft />
          <span>{t('common.back')}</span>
        </button>
        {isOwner && (
          <Link to="/dashboard/settings/profile" className="edit-profile-button">
            {t('profile.edit.button')}
          </Link>
        )}
      </div>

      {/* Header del perfil */}
      <div className="profile-header">
        <div className="profile-avatar-section">
          {profile.avatar_url ? (
            <img 
              src={getAvatarUrl(profile.avatar_url)} 
              alt={`Avatar de ${profile.username} - Perfil público en ArcusX`}
              className="profile-avatar"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                // Si la imagen falla al cargar, reemplazar con placeholder
                const target = e.target as HTMLImageElement;
                const avatarSection = target.closest('.profile-avatar-section');
                if (avatarSection) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'profile-avatar-placeholder';
                  placeholder.textContent = profile.username?.charAt(0).toUpperCase() || '';
                  avatarSection.replaceChild(placeholder, target);
                }
              }}
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {profile.username?.charAt(0).toUpperCase() || <FaUser />}
            </div>
          )}
          {profile.verified && (
            <div className="verified-badge" title={t('profile.verified.title')}>
              <FaCheckCircle />
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <div className="profile-name-row">
            <h1>{profile.username}</h1>
            {!profile.public_profile && (
              <span className="private-badge" title={t('profile.private.title')}>
                <FaLock />
                {t('profile.private.badge')}
              </span>
            )}
          </div>
          
          <div className="profile-meta">
            <span className="meta-item">
              <span className="meta-text">
                {t('profile.memberSinceLine').replace('{{date}}', formatDate(profile.member_since))}
              </span>
            </span>
            {profile.portfolio_url && (
              <a 
                href={profile.portfolio_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="meta-item portfolio-link"
              >
                <span className="meta-text">{t('profile.section.external.portfolio')}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="profile-stats-grid">
          <div className="stat-card">
            <div className="stat-icon tasks-completed">
              <FaTasks style={{ color: '#ffffff', fill: '#ffffff' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.tasks_completed}</div>
              <div className="stat-label">{t('profile.stats.completed')}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon tasks-created">
              <FaBriefcase style={{ color: '#ffffff', fill: '#ffffff' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.tasks_created}</div>
              <div className="stat-label">{t('profile.stats.created')}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon earnings">
              <FaDollarSign style={{ color: '#ffffff', fill: '#ffffff' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">${stats.total_earned.toFixed(2)}</div>
              <div className="stat-label">{t('profile.stats.earned')}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon rating">
              <FaStar style={{ color: '#ffffff', fill: '#ffffff' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.average_rating > 0 ? (
                  <>
                    {stats.average_rating.toFixed(1)}
                    <RatingDisplay 
                      averageRating={stats.average_rating} 
                      totalRatings={stats.total_ratings}
                      size="small"
                      hideRatingValue={true}
                    />
                  </>
                ) : (
                  'N/A'
                )}
              </div>
              <div className="stat-label">
                {stats.total_ratings} {stats.total_ratings === 1 ? 'Rating' : 'Ratings'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Biografía */}
      <div className="profile-section">
        <h2 className="section-title">{t('profile.section.bio')}</h2>
        {profile.bio ? (
          <div className="bio-content">
            <p className="profile-bio-full">{profile.bio}</p>
          </div>
        ) : (
          <div className="empty-state">
            <p>{t('profile.bio.empty')}</p>
          </div>
        )}
      </div>

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 ? (
        <div className="profile-section">
<h2 className="section-title">{t('profile.section.skills')}</h2>
        <div className="skills-grid">
            {profile.skills.map((skill, index) => (
              <div 
                key={skill.id || index} 
                className="skill-badge"
                style={{ 
                  borderColor: getSkillLevelColor(skill.level || 'beginner'),
                  background: `linear-gradient(135deg, ${getSkillLevelColor(skill.level || 'beginner')}20 0%, ${getSkillLevelColor(skill.level || 'beginner')}10 100%)`
                }}
              >
                <span className="skill-name">{skill.name}</span>
                {skill.level && (
                  <span className="skill-level">{skill.level}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="profile-section">
          <h2 className="section-title">{t('profile.section.skills')}</h2>
          <div className="empty-state">
            <p>{t('profile.skills.empty')}</p>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default UserProfile;
