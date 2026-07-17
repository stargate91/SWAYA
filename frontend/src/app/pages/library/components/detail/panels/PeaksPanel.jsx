import { Trash2, Droplets } from '@/ui/icons';
import { formatTime } from '../../../utils/detailUtils';
import { useMediaDetailContext } from '../MediaDetailContext';
import Pill from '@/ui/Pill';
import Text from '@/ui/Text';
import Stack from '@/ui/Stack';
import IconButton from '@/ui/IconButton';
import Table from '@/ui/Table';
import EmptyState from '@/ui/EmptyState';

const LPAR = '(';
const RPAR = ')';
const DASH_CHAR = '—';

export default function PeaksPanel() {
  const { state, mutations, t } = useMediaDetailContext();
  const { item } = state;
  const { deletePeakMutation } = mutations;

  const formatLogDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const handleDeletelog = (logId) => {
    if (deletePeakMutation.isPending) return;
    deletePeakMutation.mutate({ itemId: item.id, logId });
  };

  const peaks = item?.peaks_history || [];

  const columns = [
    {
      key: 'watched_at',
      label: t('library.details.peakDate') || 'Date',
      render: (value, log) => formatLogDate(log.watched_at),
    },
    {
      key: 'video_position',
      label: t('library.details.peakPosition') || 'Position',
      render: (value, log) => (
        log.video_position != null ? (
          <Pill variant="default" icon={<Droplets size={12} />}>
            {formatTime(log.video_position)}
          </Pill>
        ) : (
          <Text color="muted">{DASH_CHAR}</Text>
        )
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '2.5rem',
      render: (value, log) => (
        <IconButton
          variant="flat-danger"
          size="sm"
          onClick={() => handleDeletelog(log.id)}
          disabled={deletePeakMutation.isPending}
          title={t('library.details.deletePeakBtn') || 'Delete Peak'}
        >
          <Trash2 size={14} />
        </IconButton>
      ),
    },
  ];

  return (
    <Stack gap="lg">
      <div>
        <h4>
          {t('library.details.peaksTitle') || 'Peak Moments'} {LPAR}{peaks.length}{RPAR}
        </h4>
      </div>

      <Table
        columns={columns}
        rows={peaks}
        emptyContent={
          <EmptyState
            border="solid"
            background="solid"
            size="md"
            title={t('library.details.noPeaks') || 'No peak moments recorded yet.'}
          />
        }
      />
    </Stack>
  );
}
