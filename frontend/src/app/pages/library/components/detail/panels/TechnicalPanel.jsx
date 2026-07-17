import PropTypes from 'prop-types';
import { EDITION_LABELS, SOURCE_LABELS, AUDIO_TYPE_LABELS, formatTime } from '../../../utils/detailUtils';
import { useMediaDetailContext } from '../MediaDetailContext';
import SpecCard from '@/ui/SpecCard';
import Grid from '@/ui/Grid';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import Divider from '@/ui/Divider';

export default function TechnicalPanel({ showTitle = true, variant }) {
  const { state, t } = useMediaDetailContext();
  const {
    item,
    isMovie
  } = state;

  const audioCodecText = item?.technical?.audio_codec
    ? `${item.technical.audio_codec.toUpperCase()} (${item.technical.audio_channels}ch)`
    : '';
  const bitDepthText = item?.technical?.bit_depth
    ? `${item.technical.bit_depth}-bit`
    : '';
  const framerateText = item?.technical?.framerate
    ? `${parseFloat(item.technical.framerate).toFixed(3)} fps`
    : '';
  const bytesToSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    if (i === 0) return `${bytes} ${sizes[i]}`;
    return `${(bytes / (1024 ** i)).toFixed(2)} ${sizes[i]}`;
  };
  const hasEditionSource = isMovie && (
    (item.technical?.edition && item.technical.edition !== 'none')
    || (item.technical?.source && item.technical.source !== 'none')
    || (item.technical?.audio_type && item.technical.audio_type !== 'none')
  );
  const hasSpecs = !!item?.technical;

  const gridVariant = variant === 'drawer' ? 'split' : 'specs';

  return (
    <Stack gap="xl">
      {showTitle && hasEditionSource && (
        <Stack gap="md">
          <Stack gap="xs">
            <Text as="h4" variant="caption" uppercase color={variant === 'drawer' ? 'faint' : 'muted'}>
              {t('library.details.editionAndSource') || 'Edition & Source'}
            </Text>
            {variant === 'drawer' && <Divider />}
          </Stack>
          <Grid variant={gridVariant} gap="sm">
            {item.technical?.edition && item.technical.edition !== 'none' && (
              <SpecCard
                label={t('library.details.edition') || 'Edition'}
                value={EDITION_LABELS[item.technical.edition] || item.technical.edition}
              />
            )}
            {item.technical?.source && item.technical.source !== 'none' && (
              <SpecCard
                label={t('library.details.source') || 'Source'}
                value={SOURCE_LABELS[item.technical.source] || item.technical.source}
              />
            )}
            {item.technical?.audio_type && item.technical.audio_type !== 'none' && (
              <SpecCard
                label={t('library.details.audioStyle') || 'Audio Style'}
                value={AUDIO_TYPE_LABELS[item.technical.audio_type] || item.technical.audio_type}
              />
            )}
          </Grid>
        </Stack>
      )}

      {hasSpecs ? (
        <Stack gap="md">
          {showTitle && (
            <Stack gap="xs">
              <Text as="h4" variant="caption" uppercase color={variant === 'drawer' ? 'faint' : 'muted'}>
                {t('library.details.technicalInfo') || 'Technical Info'}
              </Text>
              {variant === 'drawer' && <Divider />}
            </Stack>
          )}
          <Grid variant={gridVariant} gap="sm">
            {item.technical.resolution && (
              <SpecCard label={t('library.details.resolution') || 'Resolution'} value={item.technical.resolution} />
            )}
            {item.technical.video_codec && (
              <SpecCard label={t('library.details.videoCodec') || 'Video Codec'} value={item.technical.video_codec.toUpperCase()} />
            )}
            {item.technical.audio_codec && (
              <SpecCard label={t('library.details.audioCodec') || 'Audio Codec'} value={audioCodecText} />
            )}
            {item.technical.duration && (
              <SpecCard label={t('library.details.duration') || 'Duration'} value={formatTime(item.technical.duration)} />
            )}
            {item.technical.size_bytes && (
              <SpecCard label={t('library.details.fileSize') || 'File Size'} value={bytesToSize(item.technical.size_bytes)} />
            )}
            {item.technical.hdr_type && (
              <SpecCard label={t('library.details.hdr') || 'HDR'} value={item.technical.hdr_type} />
            )}
            {item.technical.bit_depth && (
              <SpecCard label={t('library.details.bitDepth') || 'Bit Depth'} value={bitDepthText} />
            )}
            {item.technical.framerate && (
              <SpecCard label={t('library.details.framerate') || 'Framerate'} value={framerateText} />
            )}
          </Grid>
        </Stack>
      ) : null}
    </Stack>
  );
}

TechnicalPanel.propTypes = {
  showTitle: PropTypes.bool,
  variant: PropTypes.string,
};
