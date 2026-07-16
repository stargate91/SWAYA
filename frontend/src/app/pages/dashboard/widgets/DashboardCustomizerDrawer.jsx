import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { GripVertical } from '@/ui/icons';
import Switch from '@/ui/Switch';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import Drawer from '@/ui/Drawer';
import { useTranslation } from '../../../providers/LanguageContext';
import Inline from '@/ui/Inline';

export default function DashboardCustomizerDrawer({
  isOpen,
  onClose,
  visibleWidgets,
  toggleWidget,
  widgetOrder = [],
  handleOrderChange,
  showAdult,
  styles = {},
  widgetRegistry = {},
}) {
  const { t } = useTranslation();
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
      className={styles['dashboard-customizer-drawer']}
      variant="glass"
    >
      <div className={styles['dashboard-customizer-content']}>
        <p className={styles['dashboard-customizer-desc']}>
          {t('dashboard.customize_desc') || 'Select which widgets you want to display on your dashboard.'}
        </p>

        <div className={styles['dashboard-customizer-list']}>
          {widgetOrder.map((key, index) => {
            const widgetConfig = widgetRegistry[key];
            if (!widgetConfig) return null;

            if (widgetConfig.show && !widgetConfig.show(null, isNsfw)) {
              // Note: settings query is not passed down directly here. However, settings is only 
              // needed for checking `tmdb_api_key` for top_20.
              // In this case we can allow the user to toggle/order it even if key is missing,
              // or let `DashboardView` hide it in main view. If we need strict checks, we can pass settings.
            }
            if (key === 'adult' && !showAdult) return null;

            const titleKey = typeof widgetConfig.titleKey === 'function'
              ? widgetConfig.titleKey(isNsfw)
              : widgetConfig.titleKey;

            const fallbackTitle = typeof widgetConfig.fallbackTitle === 'function'
              ? widgetConfig.fallbackTitle(isNsfw)
              : widgetConfig.fallbackTitle;

            const label = t(titleKey) || fallbackTitle;
            const switchKey = key;
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
                  className={`${styles['dashboard-customizer-item']} ${isDragOver ? styles['is-drag-over'] : ''}`}
                >
                  <Inline align="center" className={styles['dashboard-customizer-item-header']}>
                    <Inline gap="md" align="center" className={styles['dashboard-customizer-item-left']}>
                      <div className={styles['dashboard-customizer-grip']}>
                        <GripVertical size={16} />
                      </div>
                      <span className={styles['dashboard-customizer-item-label']}>{label}</span>
                    </Inline>

                    <Switch
                      checked={Boolean(visibleWidgets[switchKey])}
                      onChange={() => toggleWidget(switchKey)}
                    />
                  </Inline>
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
  widgetRegistry: PropTypes.object,
};
