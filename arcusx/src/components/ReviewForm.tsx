/**
 * ReviewForm.tsx
 * Formulario para crear un rating y review
 */

import { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { createRating, CreateRatingPayload } from '../services/ratingService';
import '../css/ReviewForm.css';

interface ReviewFormProps {
  taskId: number;
  ratedUserId: number;
  ratedUserName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReviewForm = ({
  taskId,
  ratedUserId,
  ratedUserName,
  onSuccess,
  onCancel
}: ReviewFormProps) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStarClick = (value: number) => {
    setRating(value);
    setError(null);
  };

  const handleStarHover = (value: number) => {
    setHoveredRating(value);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Por favor, selecciona una calificación');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateRatingPayload = {
        task_id: taskId,
        rated_user_id: ratedUserId,
        rating,
        review: review.trim() || undefined
      };

      await createRating(payload);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Error al enviar la calificación');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <div className="review-form-container">
      <div className="review-form-header">
        <h3>Calificar a {ratedUserName}</h3>
        <p>¿Cómo fue tu experiencia trabajando con {ratedUserName}?</p>
      </div>

      <form onSubmit={handleSubmit} className="review-form">
        <div className="rating-input-section">
          <label>Calificación *</label>
          <div className="star-rating-input">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`star-button ${value <= displayRating ? 'active' : ''}`}
                onClick={() => handleStarClick(value)}
                onMouseEnter={() => handleStarHover(value)}
                onMouseLeave={handleStarLeave}
                disabled={submitting}
              >
                <FaStar />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <span className="rating-label">
              {rating === 1 && 'Muy malo'}
              {rating === 2 && 'Malo'}
              {rating === 3 && 'Regular'}
              {rating === 4 && 'Bueno'}
              {rating === 5 && 'Excelente'}
            </span>
          )}
        </div>

        <div className="review-text-section">
          <label htmlFor="review">Review (opcional)</label>
          <textarea
            id="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Comparte tu experiencia trabajando con este usuario..."
            rows={4}
            maxLength={500}
            disabled={submitting}
          />
          <span className="character-count">{review.length}/500</span>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="review-form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-cancel"
              disabled={submitting}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="btn-submit"
            disabled={submitting || rating === 0}
          >
            {submitting ? 'Enviando...' : 'Enviar Calificación'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;

