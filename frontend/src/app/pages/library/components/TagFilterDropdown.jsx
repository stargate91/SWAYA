/* eslint-disable react/forbid-dom-props, react/jsx-no-literals, i18next/no-literal-string */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import Checkbox from '@/ui/Checkbox';
import useClickOutside from '../hooks/useClickOutside';

export default function TagFilterDropdown({
  t,
  actualSelectedTags,
  actualSetSelectedTags,
  filterData,
  setCurrentPage
}) {
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagDropdownRef = useRef(null);
  const tagTriggerRef = useRef(null);
  const [tagMenuCoords, setTagMenuCoords] = useState({ top: 0, left: 0, width: 0 });

  useClickOutside(tagDropdownRef, () => setIsTagDropdownOpen(false));

  const updateTagMenuCoords = () => {
    if (tagTriggerRef.current) {
      const rect = tagTriggerRef.current.getBoundingClientRect();
      const threshold = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < threshold && rect.top > spaceBelow;

      setTagMenuCoords({
        top: openUpwards
          ? rect.top + window.scrollY - 6
          : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 220),
        openUpwards,
      });
    }
  };

  useEffect(() => {
    if (isTagDropdownOpen) {
      updateTagMenuCoords();
      window.addEventListener('scroll', updateTagMenuCoords, true);
      window.addEventListener('resize', updateTagMenuCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateTagMenuCoords, true);
      window.removeEventListener('resize', updateTagMenuCoords);
    };
  }, [isTagDropdownOpen]);

  if (!filterData?.tags || filterData.tags.length === 0) {
    return null;
  }

  return (
    <div className="library-sorter-container" ref={tagDropdownRef}>
      <span className="library-sorter-label">{t('library.filter.tagsLabel') || 'Tags:'}</span>
      <div className="ui-dropdown ui-dropdown--sorter" style={{ position: 'relative' }}>
        <div className="ui-dropdown__sorter-wrapper">
          <button
            ref={tagTriggerRef}
            type="button"
            className="ui-dropdown__trigger ui-dropdown__trigger--sorter ui-dropdown__trigger--sorter-custom"
            onClick={() => setIsTagDropdownOpen(prev => !prev)}
          >
            <span className="ui-dropdown__trigger-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {actualSelectedTags.length === 0
                ? (t('library.filter.allTags') || 'All Tags')
                : `${actualSelectedTags.join(', ')}`}
            </span>
            <span className="ui-dropdown__chevron" style={{ display: 'flex', alignItems: 'center' }}>
              <ChevronDown size={12} />
            </span>
          </button>
        </div>
        {isTagDropdownOpen && createPortal(
          <div
            className={`ui-dropdown__menu has-search ${tagMenuCoords.openUpwards ? 'is-upwards' : ''}`}
            style={{
              display: 'block',
              position: 'absolute',
              top: `${tagMenuCoords.top}px`,
              left: `${tagMenuCoords.left}px`,
              width: `${tagMenuCoords.width}px`,
              zIndex: 9999
            }}
          >
            <div className="ui-dropdown__search-container">
              <input
                type="text"
                className="ui-dropdown__search-input"
                placeholder={t('dropdown.search') || 'Search...'}
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
              />
            </div>
            <div className="ui-dropdown__items-wrapper" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {filterData.tags
                .filter(tag => String(tag.name || '').toLowerCase().includes(tagSearch.toLowerCase()))
                .map((tag) => {
                  const isChecked = actualSelectedTags.includes(tag.name);
                  return (
                    <div
                      key={tag.id}
                      className="ui-dropdown__item tags-dropdown-item"
                      style={{
                        padding: 0,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            actualSetSelectedTags(actualSelectedTags.filter(t => t !== tag.name));
                          } else {
                            actualSetSelectedTags([...actualSelectedTags, tag.name]);
                          }
                          setCurrentPage(1);
                        }}
                      >
                        <span style={{
                          fontSize: '14px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: tag.color || 'var(--color-text-primary)',
                          fontWeight: 500
                        }}>
                          {tag.name}
                        </span>
                      </Checkbox>
                    </div>
                  );
                })}
              {filterData.tags.filter(tag => String(tag.name || '').toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                <div className="ui-dropdown__empty">{t('dropdown.noResults') || 'No results'}</div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
