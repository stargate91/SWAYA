import PropTypes from 'prop-types';
import { FolderOpen } from './icons';
import Button from './Button';
import Tooltip from './Tooltip';
import Stack from './Stack';
import Inline from './Inline';
import Text from './Text';
import Card from './Card';
import styles from './FileCard.module.css';

export default function FileCard({
  name,
  path,
  meta,
  onBrowse,
  browseTooltip = 'Show in Folder',
  className = '',
  ...props
}) {
  return (
    <Card padding="md" className={`${styles.card} ${className}`.trim()} {...props}>
      <Inline gap="lg" align="center" justify="between" className={styles.header}>
        <Stack gap="xs" flex={1}>
          <Tooltip content={name} side="top" triggerClassName={styles['tooltip-trigger']}>
            <Text variant="body" weight="semibold" truncate>
              {name}
            </Text>
          </Tooltip>
          {path ? (
            <Tooltip content={path} side="top" triggerClassName={styles['tooltip-trigger']}>
              <Text variant="small" color="secondary" truncate>
                {path}
              </Text>
            </Tooltip>
          ) : null}
          {meta ? (
            <Tooltip content={meta} side="top" triggerClassName={styles['tooltip-trigger']}>
              <Text variant="caption" color="muted" uppercase truncate>
                {meta}
              </Text>
            </Tooltip>
          ) : null}
        </Stack>
        {path && onBrowse ? (
          <Tooltip content={browseTooltip} side="top">
            <Button
              variant="secondary-neutral"
              size="sm"
              className={styles['browse-btn']}
              onClick={onBrowse}
              title={null}
            >
              <FolderOpen size={14} />
            </Button>
          </Tooltip>
        ) : null}
      </Inline>
    </Card>
  );
}

FileCard.propTypes = {
  name: PropTypes.string.isRequired,
  path: PropTypes.string,
  meta: PropTypes.string,
  onBrowse: PropTypes.func,
  browseTooltip: PropTypes.string,
  className: PropTypes.string
};
