import { useEffect, useRef, useState } from 'react';
import { Globe } from '@/ui/icons';
import './PeopleLinksPopover.css';
import Inline from '@/ui/Inline';
import Tooltip from '@/ui/Tooltip';

export default function PeopleLinksPopover({ extraLinks, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!extraLinks || extraLinks.length === 0) {
    return null;
  }

  return (
    <div ref={popoverRef} className={`entity-detail-page__links-popover-wrap${isOpen ? ' is-open' : ''}`}>
      <Tooltip content={t?.('library.details.externalLinks') || 'External Links'} side="top">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="media-detail-page__side-nav-toggle"
          aria-expanded={isOpen}
        >
          <Globe size={18} />
        </button>
      </Tooltip>

      {isOpen && (
        <div className="entity-detail-page__links-popover">
          <div className="entity-detail-page__links-popover-header">
            {t?.('library.details.externalLinks') || 'External Links'}
          </div>
          <Inline gap="xs" className="entity-detail-page__links-popover-grid">
            {extraLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="entity-detail-page__links-popover-item"
              >
                {link.label}
              </a>
            ))}
          </Inline>
        </div>
      )}
    </div>
  );
}
