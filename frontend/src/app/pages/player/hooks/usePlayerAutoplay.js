import { useEffect } from 'react';

export default function usePlayerAutoplay({
  showEndOverlay,
  nextEpisode,
  countdownIntervalRef,
  setCountdown,
  handlePlayNextRef,
}) {
  useEffect(() => {
    let timer;
    let fired = false;
    if (showEndOverlay && nextEpisode) {
      timer = setTimeout(() => {
        setCountdown(10);
      }, 0);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            if (!fired) {
              fired = true;
              handlePlayNextRef.current();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showEndOverlay, nextEpisode, setCountdown, countdownIntervalRef, handlePlayNextRef]);
}
