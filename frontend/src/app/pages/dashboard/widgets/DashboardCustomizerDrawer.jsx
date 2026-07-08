import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { GripVertical } from '@/ui/icons';
import Switch from '@/ui/Switch';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import Drawer from '@/ui/Drawer';

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
  const [dragOverIndex, setDragOverIndex] = useState(null);

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

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('dashboard.customize') || 'Customize Dashboard'}
      size="sm"
      className="dashboard-customizer-drawer"
    >
      <div className="dashboard-customizer-content">
        <p className="dashboard-customizer-desc">
          {t('dashboard.customize_desc') || 'Select which widgets you want to display on your dashboard.'}
        </p>

        <div className="dashboard-customizer-list">
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
                <div className="dashboard-customizer-child-switches">
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


              const isDragOver = index === dragOverIndex;

              return (
                // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                <div
                  key={key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`dashboard-customizer-item ${isDragOver ? 'is-drag-over' : ''}`}
                >
                  <div className="dashboard-customizer-item-header">
                    <div className="dashboard-customizer-item-left">
                      <div className="dashboard-customizer-grip">
                        <GripVertical size={16} />
                      </div>
                      <span className="dashboard-customizer-item-label">{label}</span>
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
    </Drawer>
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
