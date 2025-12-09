/**
 * RatingDisplay.tsx
 * Componente para mostrar rating promedio y distribución
 */

import { FaStar } from 'react-icons/fa';
import '../css/RatingDisplay.css';

interface RatingDisplayProps {
  averageRating: number;
  totalRatings: number;
  ratingDistribution?: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
  showDistribution?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const RatingDisplay = ({
  averageRating,
  totalRatings,
  ratingDistribution,
  showDistribution = false,
  size = 'medium'
}: RatingDisplayProps) => {
  const fullStars = Math.floor(averageRating);
  const hasHalfStar = averageRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClass = `rating-${size}`;

  return (
    <div className={`rating-display ${sizeClass}`}>
      <div className="rating-stars">
        {[...Array(fullStars)].map((_, i) => (
          <FaStar key={`full-${i}`} className="star star-full" />
        ))}
        {hasHalfStar && <FaStar className="star star-half" />}
        {[...Array(emptyStars)].map((_, i) => (
          <FaStar key={`empty-${i}`} className="star star-empty" />
        ))}
      </div>
      <div className="rating-info">
        <span className="rating-value">{averageRating.toFixed(1)}</span>
        {totalRatings > 0 && (
          <span className="rating-count">({totalRatings})</span>
        )}
      </div>
      
      {showDistribution && ratingDistribution && (
        <div className="rating-distribution">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[String(rating) as keyof typeof ratingDistribution];
            const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            return (
              <div key={rating} className="distribution-row">
                <span className="distribution-rating">{rating}★</span>
                <div className="distribution-bar">
                  <div
                    className="distribution-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="distribution-count">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RatingDisplay;

