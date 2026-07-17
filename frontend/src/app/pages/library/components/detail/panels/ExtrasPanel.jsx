import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import FileCard from '@/ui/FileCard';
import { useMediaDetailContext } from '../MediaDetailContext';
import { showItemInFolder } from '@/lib/ipc';

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
            {group.items.map((extra) => (
              <FileCard
                key={extra.id}
                name={extra.name}
                path={extra.path}
                meta={getExtraMeta(extra)}
                browseTooltip={t('library.details.showInFolder') || 'Show in Folder'}
                onBrowse={extra.path ? async () => {
                  const result = await showItemInFolder(extra.path);
                  if (!result?.success) {
                    toast(result?.error || t('organizer.toasts.showInFolderFailed'), 'danger');
                  }
                } : undefined}
              />
            ))}
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
