/**
 * RatingSystem.tsx
 * Componente principal que combina RatingDisplay y ReviewForm
 */

import { useState, useEffect } from 'react';
import RatingDisplay from './RatingDisplay';
import ReviewForm from './ReviewForm';
import { getRatings, getUserRatingSummary, Rating } from '../services/ratingService';
import '../css/RatingSystem.css';
import { FaStar } from 'react-icons/fa';

interface RatingSystemProps {
  userId: number;
  taskId?: number;
  showForm?: boolean;
  ratedUserId?: number;
  ratedUserName?: string;
  onRatingSubmitted?: () => void;
  compact?: boolean;
}

const RatingSystem = ({
  userId,
  taskId,
  showForm = false,
  ratedUserId,
  ratedUserName,
  onRatingSubmitted,
  compact = false
}: RatingSystemProps) => {
  const [summary, setSummary] = useState<{
    average_rating: number;
    total_ratings: number;
    rating_distribution: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  } | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(showForm);
  const [hasRated, setHasRated] = useState(false);

  // Cargar resumen de ratings
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getUserRatingSummary(userId);
        setSummary(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar ratings');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchSummary();
    }
  }, [userId]);

  // Verificar si ya se calificó esta tarea
  useEffect(() => {
    const checkExistingRating = async () => {
      if (taskId && userId) {
        try {
          const data = await getRatings(undefined, taskId);
          const existingRating = data.ratings.find(
            (r) => r.rater_id === userId
          );
          setHasRated(!!existingRating);
        } catch (err) {
          // Ignorar errores al verificar
        }
      }
    };

    checkExistingRating();
  }, [taskId, userId]);

  // Cargar ratings si se solicita
  useEffect(() => {
    const fetchRatings = async () => {
      if (userId && !compact) {
        try {
          const data = await getRatings(userId, undefined, 1, 10);
          setRatings(data.ratings);
        } catch (err) {
          // Ignorar errores
        }
      }
    };

    fetchRatings();
  }, [userId, compact]);

  const handleRatingSubmitted = () => {
    setShowReviewForm(false);
    setHasRated(true);
    
    // Recargar resumen
    if (userId) {
      getUserRatingSummary(userId).then(setSummary).catch(() => {});
    }
    
    if (onRatingSubmitted) {
      onRatingSubmitted();
    }
  };

  if (loading) {
    return <div className="rating-system-loading">Cargando ratings...</div>;
  }

  if (error && !summary) {
    return <div className="rating-system-error">{error}</div>;
  }

  const averageRating = summary?.average_rating || 0;
  const totalRatings = summary?.total_ratings || 0;

  return (
    <div className={`rating-system ${compact ? 'compact' : ''}`}>
      {showReviewForm && taskId && ratedUserId && ratedUserName && !hasRated && (
        <div className="rating-form-modal">
          <div className="rating-form-modal-content">
            <ReviewForm
              taskId={taskId}
              ratedUserId={ratedUserId}
              ratedUserName={ratedUserName}
              onSuccess={handleRatingSubmitted}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        </div>
      )}

      {summary && (
        <RatingDisplay
          averageRating={averageRating}
          totalRatings={totalRatings}
          ratingDistribution={summary.rating_distribution}
          showDistribution={!compact}
          size={compact ? 'small' : 'medium'}
        />
      )}

      {!compact && ratings.length > 0 && (
        <div className="ratings-list">
          <h4>Últimas Reviews</h4>
          {ratings.slice(0, 5).map((rating) => (
            <div key={rating.id} className="rating-item">
              <div className="rating-item-header">
                <span className="rating-item-rater">
                  {rating.rater_username || 'Usuario'}
                </span>
                <div className="rating-item-stars">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`star ${i < rating.rating ? 'filled' : 'empty'}`}
                    >
                      <FaStar aria-hidden="true" />
                    </span>
                  ))}
                </div>
                <span className="rating-item-date">
                  {new Date(rating.created_at).toLocaleDateString()}
                </span>
              </div>
              {rating.review && (
                <p className="rating-item-review">{rating.review}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {taskId && ratedUserId && ratedUserName && !hasRated && !showReviewForm && (
        <button
          className="btn-rate-user"
          onClick={() => setShowReviewForm(true)}
        >
          Calificar Usuario
        </button>
      )}
    </div>
  );
};

export default RatingSystem;

