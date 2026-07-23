import { FolderOpen, Video, Check, Eye, Play, BellPlus, Droplets, Info, Download } from '@/ui/icons';
import Button from '@/ui/Button';
import { formatEpisodeNumber } from '../../utils/detailUtils';
import { useMediaDetailContext } from './MediaDetailContext';
import Inline from '@/ui/Inline';
import { useState } from 'react';
import TorrentSearchModal from '../../../dashboard/widgets/components/TorrentSearchModal.jsx';
import { useSettingsQuery } from '@/queries/settingsQueries';

export default function MediaActions() {
  const { state, actions, mutations, t, navigate, setIsDrawerOpen } = useMediaDetailContext();
  const {
    isOwned,
    isMovie,
    isScene,
    item,
    isTracked,
    canToggleTracked,
    isWatched,
    canToggleWatched,
    nextEpisodeInfo,
    cleanId,
    effectiveId
  } = state;

  const {
    handleTrailerClick,
    handleToggleWatched,
    handleToggleTracked,
    handlePlayClick
  } = actions;

  const {
    updateStatusMutation,
    bulkUpdateWatchedMutation,
    toggleTrackedMutation,
    playMutation,
    addPeakMutation
  } = mutations;

  const hasCollection = isMovie && item?.collection_data;
  const hasTrailer = item?.trailer_key;

  const [modalOpen, setModalOpen] = useState(false);
  const { data: settings = {} } = useSettingsQuery();
  const torrentEnabled = settings?.torrent_enabled;

  if (!isOwned && !canToggleTracked && !canToggleWatched && !hasCollection && !hasTrailer && !(!isOwned && torrentEnabled)) return null;

  return (
    <Inline gap="lg" align="center" className="media-detail-page__actions-row">
      {!isOwned && torrentEnabled && (
        <>
          <Button
            variant="ghost"
            onClick={() => setModalOpen(true)}
          >
            <Download size={16} />
            Download
          </Button>
          <TorrentSearchModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            defaultQuery={item?.title || item?.name}
          />
        </>
      )}
      {hasCollection && (
        <Button
          variant="ghost"
          onClick={() => navigate(`/library/collection/${item?.collection_data.tmdb_id}`)}
        >
          <FolderOpen size={16} />
          {t('library.details.collection') || 'Collection'}
        </Button>
      )}

      {hasTrailer && (
        <Button
          variant="ghost"
          onClick={handleTrailerClick}
        >
          <Video size={16} />
          {t('library.details.trailer') || 'Trailer'}
        </Button>
      )}

      {canToggleWatched && (
        <Button
          variant="ghost"
          onClick={handleToggleWatched}
          disabled={updateStatusMutation.isPending || bulkUpdateWatchedMutation.isPending}
        >
          {isWatched ? <Check size={16} /> : <Eye size={16} />}
          {isWatched ? (t('library.details.watched') || 'Watched') : (t('library.details.markWatched') || 'Mark as Watched')}
        </Button>
      )}

      {canToggleTracked && (
        <Button
          variant="ghost"
          onClick={handleToggleTracked}
          disabled={toggleTrackedMutation.isPending}
        >
          {isTracked ? <Check size={16} /> : <BellPlus size={16} />}
          {isTracked ? 'Tracked' : 'Track'}
        </Button>
      )}

      {!isScene && !(isMovie && !isOwned) && (item?.extras?.length > 0 || item?.technical) && (
        <Button
          variant="ghost"
          onClick={() => setIsDrawerOpen(true)}
        >
          <Info size={16} />
          {t('library.details.details') || 'Details'}
        </Button>
      )}

      {isOwned && (
        <>
          {(item?.is_adult && (isMovie || isScene)) && (
            <Button
              variant="ghost"
              onClick={() => addPeakMutation.mutate({ itemId: effectiveId, tvId: cleanId })}
              disabled={addPeakMutation.isPending}
            >
              <Droplets size={16} />
              {t('library.details.addPeak') || 'Add Peak'}
            </Button>
          )}

          {isMovie || isScene ? (
            <Button
              variant="secondary"
              onClick={handlePlayClick}
              disabled={playMutation.isPending}
            >
              <Play size={16} fill="currentColor" />
              {item?.resume_position > 0 ? (t('library.details.resume') || 'Resume') : (t('library.details.play') || 'Play')}
            </Button>
          ) : (
            nextEpisodeInfo && (
              <Button
                variant="secondary"
                onClick={handlePlayClick}
                disabled={playMutation.isPending}
              >
                <Play size={16} fill="currentColor" />
                {t('library.details.continueEpisode', { defaultValue: 'Continue S{{season}} E{{episode}}', season: nextEpisodeInfo.seasonNumber, episode: formatEpisodeNumber(nextEpisodeInfo.episode.episode_number) })}
              </Button>
            )
          )}
        </>
      )}
    </Inline>
  );
}
