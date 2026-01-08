import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCheckCircle, FaBriefcase, FaStar, FaDollarSign, FaTasks, FaCalendarAlt, FaGlobe, FaLock } from 'react-icons/fa';
import { getUserProfile, getUserPublicStats } from '../services/profileService';
import type { UserProfile as UserProfileType, UserStatistics } from '../types/profile';
import RatingDisplay from './RatingDisplay';
import '../css/UserProfile.css';

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
      <div className="user-profile-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando perfil...</p>
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

  return (
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
              src={`${import.meta.env.VITE_API_URL || ''}${profile.avatar_url}`} 
              alt={profile.username}
              className="profile-avatar"
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
          
          {profile.bio ? (
            <p className="profile-bio">{profile.bio}</p>
          ) : (
            <p className="profile-bio-empty">Este usuario aún no ha agregado una biografía.</p>
          )}
          
          <div className="profile-meta">
            <span className="meta-item">
              <FaCalendarAlt />
              Miembro desde {formatDate(profile.member_since)}
            </span>
            {profile.portfolio_url && (
              <a 
                href={profile.portfolio_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="meta-item portfolio-link"
              >
                <FaGlobe />
                Portfolio Externo
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

      {/* Portfolio */}
      <div className="profile-section">
        <h2 className="section-title">Portfolio</h2>
        {profile.portfolio && profile.portfolio.length > 0 ? (
          <div className="portfolio-grid">
            {profile.portfolio.map((item) => (
              <div key={item.id} className="portfolio-item">
                {item.image_url ? (
                  <div className="portfolio-image">
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="portfolio-image-placeholder"><FaBriefcase /></div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="portfolio-image-placeholder">
                    <FaBriefcase />
                  </div>
                )}
                <div className="portfolio-content">
                  <h3>{item.title}</h3>
                  {item.description && (
                    <p>{item.description}</p>
                  )}
                  <div className="portfolio-actions">
                    {item.project_url && (
                      <a 
                        href={item.project_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="portfolio-link"
                      >
                        <FaGlobe />
                        Ver Proyecto
                      </a>
                    )}
                    {item.category && (
                      <span className="portfolio-category">{item.category}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FaBriefcase />
            <p>Este usuario aún no ha agregado proyectos a su portfolio</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
