import { ChevronDown, ChevronUp } from '@/ui/icons';

export default function ScrollToggleButton({
  isScrolled,
  onClick,
  t,
}) {
  return (
    <button
      type="button"
      className="entity-detail-page__scroll-toggle-btn"
      onClick={onClick}
      title={
        isScrolled
          ? (t('library.details.backToProfile') || 'Back to Profile')
          : (t('library.details.scrollToCredits') || 'Scroll to Details')
      }
    >
      {isScrolled ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  );
}
