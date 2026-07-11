import { useState, useEffect } from 'react';

export default function useHeaderScrollTransition(id, isAnyDrawerOpen, isPreviewPlaying, scrollSectionSelector = '.media-detail-page__inline-sections') {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsScrolled(false);
  }, [id]);

  useEffect(() => {
    if (isAnyDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyDrawerOpen]);

  useEffect(() => {
    if (isAnyDrawerOpen || isPreviewPlaying) return;

    const handleWheel = (e) => {
      if (e.target.closest('.global-search') || e.target.closest('.global-search__overlay')) {
        return;
      }
      if (Math.abs(e.deltaY) > 5) {
        if (e.deltaY > 0 && !isScrolled) {
          setIsScrolled(true);
        } else if (e.deltaY < 0 && isScrolled) {
          if (e.target.closest('.custom-scrollbar')) {
            return;
          }
          const isInsideSection = e.target.closest(scrollSectionSelector);
          if (isInsideSection) {
            const scrollable = isInsideSection.querySelector('.person-credits-discover-grid-wrapper, .person-credits-discover-grid');
            if (scrollable && scrollable.scrollTop > 0) {
              return;
            }
            if (isInsideSection.scrollTop > 0) {
              return;
            }
          }
          setIsScrolled(false);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isScrolled, isAnyDrawerOpen, isPreviewPlaying, scrollSectionSelector]);

  const handleScrollToggle = () => {
    setIsScrolled((prev) => !prev);
  };

  return [isScrolled, handleScrollToggle, setIsScrolled];
}
