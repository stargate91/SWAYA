import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import { useMediaDetailContext } from '../MediaDetailContext';
import { showItemInFolder } from '@/lib/ipc';
import FileCard from '@/ui/data/FileCard';
import Tooltip from '@/ui/Tooltip';
import Button from '@/ui/Button';
import { FolderOpen } from '@/ui/icons';

export default function ExtrasPanel() {
  const { state, t, toast } = useMediaDetailContext();
  const {
    item,
    isMovie
  } = state;

  const formatExtraValue = (value) => String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const extras = item.extras || [];
  const extraGroups = isMovie
    ? [{ label: null, items: extras }]
    : extras.reduce((groups, extra) => {
      const label = extra.parent_label || t('library.details.extras') || 'Extras';
      const existingGroup = groups.find((group) => group.label === label);

      if (existingGroup) {
        existingGroup.items.push(extra);
      } else {
        groups.push({ label, items: [extra] });
      }

      return groups;
    }, []);
  const getExtraMeta = (extra) => {
    const meta = [];

    if (extra.category) {
      meta.push(formatExtraValue(extra.category));
    }

    if (extra.subtype && extra.category !== 'metadata') {
      meta.push(formatExtraValue(extra.subtype));
    }

    if (extra.language) {
      meta.push(String(extra.language).toUpperCase());
    }

    return meta.join(' · ');
  };

  return (
    <Stack gap="xl">
      <Text as="h4" variant="caption" uppercase color="muted">
        {t('library.details.extras') || 'Film Extras'}
      </Text>
      <Stack scrollable gap="md">
        {extraGroups.map((group, groupIndex) => (
          <Stack
            key={group.label || `extras-group-${groupIndex}`}
            gap="md"
          >
            {group.label ? (
              <Text variant="caption" color="muted">
                {group.label}
              </Text>
            ) : null}
            {group.items.map((extra) => {
              const browseTooltip = t('library.details.showInFolder') || 'Show in Folder';
              const onBrowse = extra.path ? async () => {
                const result = await showItemInFolder(extra.path);
                if (!result?.success) {
                  toast(result?.error || t('organizer.toasts.showInFolderFailed'), 'danger');
                }
              } : undefined;

              return (
                <FileCard key={extra.id} fullWidth>
                  <Stack gap="xs" flex={1} className="u-min-w-0">
                    <Tooltip content={extra.name} side="top">
                      <Text variant="body" weight="semibold" truncate>
                        {extra.name}
                      </Text>
                    </Tooltip>
                    {extra.path ? (
                      <Tooltip content={extra.path} side="top">
                        <Text variant="small" color="secondary" truncate>
                          {extra.path}
                        </Text>
                      </Tooltip>
                    ) : null}
                    {getExtraMeta(extra) ? (
                      <Tooltip content={getExtraMeta(extra)} side="top">
                        <Text variant="caption" color="muted" uppercase truncate>
                          {getExtraMeta(extra)}
                        </Text>
                      </Tooltip>
                    ) : null}
                  </Stack>
                  {extra.path && onBrowse ? (
                    <Tooltip content={browseTooltip} side="top">
                      <Button
                        variant="secondary-neutral"
                        size="sm"
                        onClick={onBrowse}
                        title={null}
                      >
                        <FolderOpen size={14} />
                      </Button>
                    </Tooltip>
                  ) : null}
                </FileCard>
              );
            })}
          </Stack>
        ))}

        {extras.length === 0 && (
          <Text variant="small" color="secondary">
            {t('library.details.noExtraFilesFound') || 'No extra files found.'}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
