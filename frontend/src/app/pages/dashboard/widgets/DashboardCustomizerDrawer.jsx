import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { GripVertical } from '@/ui/icons';
import Switch from '@/ui/Switch';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import '../../library/components/entityDetail/EntityDetailHeroSection.css';


export default function DashboardCustomizerDrawer({
  isOpen,
  onClose,
  visibleWidgets,
  toggleWidget,
  widgetOrder = [],
  handleOrderChange,
  showAdult,
  t,
}) {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const isNsfw = showAdult && sessionMode === 'nsfw';
  const draggedItemRef = useRef(null);
  const drawerRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (e.target.closest('button[aria-label="Customize Dashboard"]')) {
        return;
      }
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleDragStart = (e, index) => {
    draggedItemRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // We can clear it if needed, but simple DragOver update works great
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    const sourceIndex = draggedItemRef.current;
    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      handleOrderChange(widgetOrder[sourceIndex], targetIndex);
    }
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    draggedItemRef.current = null;
    setDragOverIndex(null);
  };

  return createPortal(
    <>
      <div
        className="entity-detail-page__drawer-backdrop ui-drawer-backdrop"
        onClick={onClose}
        onWheel={(e) => {
          const container = document.querySelector('.shell__content');
          if (container) {
            container.scrollBy(0, e.deltaY);
          } else {
            window.scrollBy(0, e.deltaY);
          }
        }}
        role="presentation"
      />
      <div
        ref={drawerRef}
        className="entity-detail-page__drawer ui-drawer ui-drawer--sm dashboard-customizer-drawer"
        style={{
          boxShadow: 'var(--shadow-overlay-strong, 0 10px 40px rgba(0,0,0,0.4))',
        }}
      >
        <div className="entity-detail-page__drawer-header">
          <h3 className="entity-detail-page__drawer-title">
            {t('dashboard.customize') || 'Customize Dashboard'}
          </h3>
          <button
            type="button"
            className="entity-detail-page__drawer-close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="entity-detail-page__drawer-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted, #888899)', lineHeight: 1.5 }}>
            {t('dashboard.customize_desc') || 'Select which widgets you want to display on your dashboard.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {widgetOrder.map((key, index) => {
              let label = '';
              let hasSwitch = true;
              let switchKey = key;
              let childSwitches = null;

              if (key === 'continue_watching') {
                label = t('dashboard.widget_continue_watching') || 'Continue Watching';
              }
              if (key === 'recommendations') {
                label = t('dashboard.customize_recommendations') || 'Recommendations & Discoveries';
                hasSwitch = false; // Container only, child items have separate switches
                childSwitches = (
                  <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    <Switch
                      checked={Boolean(visibleWidgets.spotlight)}
                      onChange={() => toggleWidget('spotlight')}
                    >
                      {t('dashboard.widget_spotlight') || 'Spotlight (Trending)'}
                    </Switch>

                    <Switch
                      checked={Boolean(visibleWidgets.recently_added)}
                      onChange={() => toggleWidget('recently_added')}
                    >
                      {t('dashboard.widget_recently_added') || 'Recently Added'}
                    </Switch>

                    <Switch
                      checked={Boolean(visibleWidgets.recently_activated_people)}
                      onChange={() => toggleWidget('recently_activated_people')}
                    >
                      {t(isNsfw ? 'dashboard.widget_recently_activated_people_adult' : 'dashboard.widget_recently_activated_people') || (isNsfw ? 'Recently Followed Adult Stars' : 'Recently Tracked People')}
                    </Switch>

                    <Switch
                      checked={Boolean(visibleWidgets.movies_discovery)}
                      onChange={() => toggleWidget('movies_discovery')}
                    >
                      {t('dashboard.widget_movies_discovery') || 'Discover Movies'}
                    </Switch>

                    <Switch
                      checked={Boolean(visibleWidgets.tv_discovery)}
                      onChange={() => toggleWidget('tv_discovery')}
                    >
                      {t('dashboard.widget_tv_discovery') || 'Discover TV Shows'}
                    </Switch>

                    <Switch
                      checked={Boolean(visibleWidgets.top_20)}
                      onChange={() => toggleWidget('top_20')}
                    >
                      {t('dashboard.widget_top_20') || 'Top 20 Discoveries'}
                    </Switch>

                    {showAdult && (
                      <Switch
                        checked={Boolean(visibleWidgets.adult)}
                        onChange={() => toggleWidget('adult')}
                      >
                        {t('dashboard.widget_adult') || 'Adult recommendations'}
                      </Switch>
                    )}
                  </div>
                );
              }
              if (key === 'insights') {
                label = t('dashboard.customize_insights') || 'Library Insights';
                hasSwitch = false;
                childSwitches = (
                  <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    <Switch
                      checked={Boolean(visibleWidgets.library_dna)}
                      onChange={() => toggleWidget('library_dna')}
                    >
                      {t('dashboard.widget_library_dna') || 'Library DNA'}
                    </Switch>

                    <Switch
                      checked={Boolean(visibleWidgets.timeline)}
                      onChange={() => toggleWidget('timeline')}
                    >
                      {t('dashboard.widget_timeline') || 'Time-Travel Timeline'}
                    </Switch>
                  </div>
                );
              }
              if (key === 'statistics') {
                label = t('dashboard.widget_statistics') || 'Statistics';
                switchKey = 'statistics';
              }

              const isDragOver = index === dragOverIndex;

              return (
                <div
                  key={key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    background: isDragOver
                      ? 'var(--color-surface-hover, rgba(59, 130, 246, 0.08))'
                      : 'var(--color-bg-panel, rgba(255,255,255,0.02))',
                    padding: '16px',
                    borderRadius: '12px',
                    border: isDragOver
                      ? '1px dashed var(--color-accent-blue, #3b82f6)'
                      : '1px solid var(--color-border, rgba(255,255,255,0.06))',
                    boxShadow: isDragOver
                      ? '0 0 12px rgba(59, 130, 246, 0.15)'
                      : 'none',
                    cursor: 'grab',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: 'var(--color-text-muted, #555566)', display: 'flex', alignItems: 'center' }}>
                        <GripVertical size={16} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{label}</span>
                    </div>

                    {hasSwitch && (
                      <Switch
                        checked={Boolean(visibleWidgets[switchKey])}
                        onChange={() => toggleWidget(switchKey)}
                      />
                    )}
                  </div>

                  {childSwitches}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

DashboardCustomizerDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  visibleWidgets: PropTypes.object.isRequired,
  toggleWidget: PropTypes.func.isRequired,
  widgetOrder: PropTypes.array.isRequired,
  handleOrderChange: PropTypes.func.isRequired,
  showAdult: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
};
