import PropTypes from 'prop-types';
import { GripVertical } from '@/ui/icons';
import Switch from '@/ui/Switch';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import Drawer from '@/ui/Drawer';
import { useTranslation } from '../../../providers/LanguageContext';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import Card from '@/ui/Card';
import useWidgetDragAndDrop from './hooks/useWidgetDragAndDrop';

export default function DashboardCustomizerDrawer({
  isOpen,
  onClose,
  visibleWidgets,
  toggleWidget,
  widgetOrder = [],
  handleOrderChange,
  showAdult,
  widgetRegistry = {},
  settings = {},
}) {
  const { t } = useTranslation();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const isNsfw = showAdult && sessionMode === 'nsfw';

  const {
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useWidgetDragAndDrop(widgetOrder, handleOrderChange);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('dashboard.customize') || 'Customize Dashboard'}
      size="sm"
      variant="glass"
      padded={true}
    >
      <Stack gap="3xl">
        <Text as="p" variant="small" color="muted">
          {t('dashboard.customize_desc') || 'Select which widgets you want to display on your dashboard.'}
        </Text>

        <Stack gap="xl">
          {widgetOrder.map((key, index) => {
            const widgetConfig = widgetRegistry[key];
            if (!widgetConfig) return null;

            if (widgetConfig.show && !widgetConfig.show(settings, isNsfw)) return null;

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
              <Card
                key={key}
                variant="soft"
                padding="md"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                data-drag-over={isDragOver}
              >
                <Inline align="center" justify="between">
                  <Inline gap="md" align="center">
                    <Text color="muted">
                      <GripVertical size={16} />
                    </Text>
                    <Text variant="body" weight="semibold">{label}</Text>
                  </Inline>

                  <Switch
                    checked={Boolean(visibleWidgets[switchKey])}
                    onChange={() => toggleWidget(switchKey)}
                  />
                </Inline>
              </Card>
            );
          })}
        </Stack>
      </Stack>
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
