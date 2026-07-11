import { useState, useCallback } from 'react';

export default function useRatingHover(currentRating) {
  const [hoveredRating, setHoveredRating] = useState(null);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    let val = Math.ceil(percent * 20) / 2;
    val = Math.max(0.5, Math.min(10.0, val));
    setHoveredRating(val);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredRating(null);
  }, []);

  const displayRating = hoveredRating !== null ? hoveredRating : currentRating;

  return {
    hoveredRating,
    setHoveredRating,
    displayRating,
    handleMouseMove,
    handleMouseLeave,
  };
}
