import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, X, Search, ChevronLeft, ChevronRight } from '@/ui/icons';
import Pill from '@/ui/Pill';
import { useAllTagsQuery } from '@/queries/libraryQueries';
import Inline from '@/ui/Inline';
import './BespokeTagger.css';

function HorizontalPillList({ children }) {
  const containerRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 1);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    checkScroll();

    window.addEventListener('resize', checkScroll);
    const observer = new MutationObserver(checkScroll);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
    };
  }, []);

  const handleScroll = (direction) => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = 150;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <Inline gap="xs" align="center" className="bespoke-tagger-scroller-wrapper">
      {showLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="bespoke-tagger-scroller-btn bespoke-tagger-scroller-btn--left"
        >
          <ChevronLeft size={12} />
        </button>
      )}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="bespoke-tagger-pills-row bespoke-tagger-pills-row--nowrap no-scrollbar"
      >
        {children}
      </div>
      {showRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="bespoke-tagger-scroller-btn bespoke-tagger-scroller-btn--right"
        >
          <ChevronRight size={12} />
        </button>
      )}
    </Inline>
  );
}

HorizontalPillList.propTypes = {
  children: PropTypes.node.isRequired,
};

function TagColorDot({ color }) {
  // eslint-disable-next-line react/forbid-dom-props
  return <span className="bespoke-tagger-dropdown-color-dot" style={{ backgroundColor: color }} />;
}

TagColorDot.propTypes = {
  color: PropTypes.string,
};

export default function BespokeTagManager({
  customTags = [],
  suggestedTags = [],
  isAdult = false,
  onUpdateTags,
  t,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { data: allTags = [] } = useAllTagsQuery(isAdult);

  const unassignedSuggestions = suggestedTags.filter(
    (tag) => !customTags.some((ct) => ct.toLowerCase() === tag.toLowerCase())
  );

  const filteredTags = allTags.filter((tag) => {
    const isAssigned = customTags.some((ct) => ct.toLowerCase() === tag.name.toLowerCase());
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAssigned && matchesSearch;
  });

  const handleToggleTag = (tagName) => {
    const isAssigned = customTags.includes(tagName);
    const nextTags = isAssigned
      ? customTags.filter((name) => name !== tagName)
      : [...customTags, tagName];
    onUpdateTags(nextTags);
  };

  const handleAddTag = (tagName) => {
    if (customTags.includes(tagName)) return;
    const nextTags = [...customTags, tagName];
    onUpdateTags(nextTags);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      const existing = allTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
      const tagNameToAdd = existing ? existing.name : trimmed;
      handleAddTag(tagNameToAdd);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bespoke-tagger-body">
      {/* Active Tags */}
      <div className="bespoke-tagger-active-section">
        <span className="bespoke-tagger-label">
          {t('library.details.activeTags') || 'Active Tags'}
        </span>
        {customTags.length > 0 ? (
          <HorizontalPillList>
            {customTags.map((tagName) => {
              const tagColor = allTags.find((t) => t.name === tagName)?.color || 'var(--color-accent-blue)';
              return (
                <Pill
                  key={tagName}
                  variant="custom"
                  customStyle={{
                    backgroundColor: `color-mix(in srgb, ${tagColor} 24%, rgba(10, 10, 15, 0.6))`,
                    borderColor: `color-mix(in srgb, ${tagColor} 50%, rgba(255, 255, 255, 0.15))`,
                    color: `color-mix(in srgb, ${tagColor} 95%, white)`,
                  }}
                  className="bespoke-tagger-pill-active"
                  onClick={() => handleToggleTag(tagName)}
                  title={`Remove tag: ${tagName}`}
                >
                  <span>{tagName}</span>
                  <X size={10} className="bespoke-tagger-pill-remove-icon" />
                </Pill>
              );
            })}
          </HorizontalPillList>
        ) : (
          <span className="bespoke-tagger-empty-text">
            {t('library.details.noTagsAssigned') || 'No tags assigned.'}
          </span>
        )}
      </div>

      {/* Add Tag Autocomplete Input */}
      <div className="bespoke-tagger-input-wrapper" ref={dropdownRef}>
        <Inline gap="sm" align="center" className="bespoke-tagger-input-container">
          <Search size={13} className="bespoke-tagger-search-icon" />
          <input
            type="text"
            placeholder={t('library.tags.searchOrAdd') || 'Search or add tag...'}
            value={searchQuery}
            onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            className="bespoke-tagger-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="bespoke-tagger-clear-btn"
            >
              <X size={12} />
            </button>
          )}
        </Inline>

        {isDropdownOpen && (filteredTags.length > 0 || searchQuery.trim()) && (
          <div className="bespoke-tagger-dropdown">
            {filteredTags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => handleAddTag(tag.name)}
                className="bespoke-tagger-dropdown-item"
              >
                <Inline gap="sm" align="center">
                  <TagColorDot color={tag.color} />
                  <span>{tag.name}</span>
                </Inline>
              </button>
            ))}
            {searchQuery.trim() && !allTags.some((t) => t.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={() => handleAddTag(searchQuery.trim())}
                className="bespoke-tagger-dropdown-item bespoke-tagger-dropdown-item--create"
              >
                <Plus size={12} />
                <span>{t('library.details.createTag', { name: searchQuery.trim() })}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Suggested Tags / Keywords */}
      {unassignedSuggestions.length > 0 && (
        <div className="bespoke-tagger-suggested-section">
          <span className="bespoke-tagger-label">
            {t('library.details.suggestedTags') || 'Suggested Tags'}
          </span>
          <HorizontalPillList>
            {unassignedSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                className="bespoke-tagger-pill-suggested"
                title={t('library.details.addTag') || 'Add tag'}
              >
                <Plus size={10} />
                <span>{tag}</span>
              </button>
            ))}
          </HorizontalPillList>
        </div>
      )}
    </div>
  );
}

BespokeTagManager.propTypes = {
  customTags: PropTypes.arrayOf(PropTypes.string),
  suggestedTags: PropTypes.arrayOf(PropTypes.string),
  isAdult: PropTypes.bool,
  onUpdateTags: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};
