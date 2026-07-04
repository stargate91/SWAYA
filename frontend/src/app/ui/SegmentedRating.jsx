/* eslint-disable react/forbid-dom-props */
import { useState } from 'react';

export default function SegmentedRating({ value, onChange, t }) {
  const [hoveredRating, setHoveredRating] = useState(null);

  const displayRating = hoveredRating !== null ? hoveredRating : value;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    let val = Math.ceil(percent * 20) / 2;
    val = Math.max(0.5, Math.min(10.0, val));
    setHoveredRating(val);
  };

  const handleMouseLeave = () => {
    setHoveredRating(null);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (hoveredRating !== null) {
      const isSame = value !== null && value !== undefined && Number(value) === Number(hoveredRating);
      const targetRating = isSame ? null : hoveredRating;
      onChange(targetRating);
    }
  };

  return (
    <div className="table-segmented-rating-container">
      <div
        className="rating-segmented-bar"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleClick}
        role="slider"
        tabIndex={0}
        aria-label={t('library.details.yourRating') || 'Your Rating'}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={displayRating ?? 0}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
          let fill = 0;
          if (displayRating >= val) {
            fill = 100;
          } else if (displayRating > val - 1) {
            fill = (displayRating - (val - 1)) * 100;
          }
          return (
            <div key={val} className="rating-segment">
              <div
                className="rating-segment-fill"
                style={{ width: `${fill}%` }}
              />
            </div>
          );
        })}
      </div>
      <span className={`user-rating-label ${displayRating !== undefined && displayRating !== null ? 'has-value' : ''}`}>
        {displayRating !== undefined && displayRating !== null
          ? displayRating.toFixed(1)
          : '-.-'}
      </span>
    </div>
  );
}
