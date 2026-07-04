import { FolderOpen } from '@/ui/icons';
import Button from '@/ui/Button';
import Tooltip from '@/ui/Tooltip';
import { useMediaDetailContext } from '../MediaDetailContext';
import './PanelsCommon.css';
import './ExtrasPanel.css';
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
    <div className="details-panel details-panel--custom extras-panel">
      <h4 className="details-panel__section-title">
        {t('library.details.extras') || 'Film Extras'}
      </h4>
      <div className="extras-panel__list">
        {extraGroups.map((group, groupIndex) => (
          <div
            key={group.label || `extras-group-${groupIndex}`}
            className="extras-panel__group"
          >
            {group.label ? (
              <span className="tags-panel__section-subtitle extras-panel__group-title">
                {group.label}
              </span>
            ) : null}
            {group.items.map((extra) => (
              <div key={extra.id} className="details-panel__section extras-panel__section">
                <div className="extras-panel__header">
                  <div className="extras-panel__header-copy">
                    <div className="extras-panel__title-row">
                      <Tooltip content={extra.name} side="top">
                        <div className="extras-panel__filename">
                          {extra.name}
                        </div>
                      </Tooltip>
                    </div>
                    {extra.path ? (
                      <Tooltip content={extra.path} side="top">
                        <div className="extras-panel__path">
                          {extra.path}
                        </div>
                      </Tooltip>
                    ) : null}
                    {getExtraMeta(extra) ? (
                      <Tooltip content={getExtraMeta(extra)} side="top">
                        <span className="extras-panel__inline-meta">
                          {getExtraMeta(extra)}
                        </span>
                      </Tooltip>
                    ) : null}
                  </div>
                  {extra.path ? (
                    <Tooltip content={t('library.details.showInFolder') || 'Show in Folder'} side="top">
                      <Button
                        variant="secondary-neutral"
                        size="sm"
                        className="extras-panel__browse-btn"
                        onClick={async () => {
                          const result = await showItemInFolder(extra.path);
                          if (!result?.success) {
                            toast(result?.error || t('organizer.toasts.showInFolderFailed'), 'danger');
                          }
                        }}
                        title={null}
                      >
                        <FolderOpen size={14} />
                      </Button>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ))}
        {extras.length === 0 && (
          <div className="details-panel__no-ratings">
            {t('library.details.noExtraFilesFound') || 'No extra files found.'}
          </div>
        )}
      </div>
    </div>
  );
}
