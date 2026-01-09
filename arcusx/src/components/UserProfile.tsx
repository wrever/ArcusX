import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCheckCircle, FaBriefcase, FaStar, FaDollarSign, FaTasks, FaLock } from 'react-icons/fa';
import { getUserProfile, getUserPublicStats } from '../services/profileService';
import type { UserProfile as UserProfileType, UserStatistics } from '../types/profile';
import RatingDisplay from './RatingDisplay';
import SEO from './SEO';
import { getAvatarUrl, getDefaultAvatarUrl } from '../utils/avatarUtils';
import '../css/UserProfile.css';
import '../css/Preloader.css';
import logo from '../images/arcus-logo.png';

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
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
      setError('ID de usuario no proporcionado');
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
        setError(err.message || 'Error al cargar perfil del usuario');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return '#28c0f0';
      case 'advanced': return '#1a8fb8';
      case 'intermediate': return '#0f5f7a';
      default: return '#0a3d4f';
    }
  };

  if (loading) {
    return (
      <div className="preloader">
        <div className="preloader-content">
          <div className="logo">
            <img src={logo} alt="ArcusX Logo" className="logo-image" />
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
          <h3>{isPrivateError ? 'Perfil Privado' : 'Error'}</h3>
          <p>{error || 'Perfil no encontrado'}</p>
          <button onClick={() => navigate(-1)} className="back-button">
            <FaArrowLeft />
            <span>Volver</span>
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
          title={`Perfil de ${profile.username}`}
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
        <button onClick={() => navigate(-1)} className="back-button">
          <FaArrowLeft />
          <span>Volver</span>
        </button>
        {isOwner && (
          <Link to="/dashboard/settings/profile" className="edit-profile-button">
            Editar Perfil
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
            <div className="verified-badge" title="Usuario verificado">
              <FaCheckCircle />
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <div className="profile-name-row">
            <h1>{profile.username}</h1>
            {!profile.public_profile && (
              <span className="private-badge" title="Perfil privado">
                <FaLock />
                Privado
              </span>
            )}
          </div>
          
          <div className="profile-meta">
            <span className="meta-item">
              <span className="meta-text">Miembro desde {formatDate(profile.member_since)}</span>
            </span>
            {profile.portfolio_url && (
              <a 
                href={profile.portfolio_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="meta-item portfolio-link"
              >
                <span className="meta-text">Portfolio Externo</span>
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
              <FaTasks />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.tasks_completed}</div>
              <div className="stat-label">Tareas Completadas</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon tasks-created">
              <FaBriefcase />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.tasks_created}</div>
              <div className="stat-label">Tareas Creadas</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon earnings">
              <FaDollarSign />
            </div>
            <div className="stat-content">
              <div className="stat-value">${stats.total_earned.toFixed(2)}</div>
              <div className="stat-label">Total Ganado</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon rating">
              <FaStar />
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
        <h2 className="section-title">Biografía</h2>
        {profile.bio ? (
          <div className="bio-content">
            <p className="profile-bio-full">{profile.bio}</p>
          </div>
        ) : (
          <div className="empty-state">
            <p>Este usuario aún no ha agregado una biografía.</p>
          </div>
        )}
      </div>

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 ? (
        <div className="profile-section">
          <h2 className="section-title">Habilidades</h2>
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
          <h2 className="section-title">Habilidades</h2>
          <div className="empty-state">
            <p>Este usuario aún no ha agregado habilidades.</p>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default UserProfile;
