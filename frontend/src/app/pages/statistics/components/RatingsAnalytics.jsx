import { BarChart2, CheckCircle, Users, Heart } from '@/ui/icons';
import SegmentedControl from '@/ui/SegmentedControl';
import Skeleton from '@/ui/Skeleton';
import Inline from '@/ui/Inline';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import LinearProgress from '@/ui/LinearProgress';
import SegmentedRating from '@/ui/SegmentedRating';
import styles from './RatingsAnalytics.module.css';

const bulletSep = '\u2022';

const getPercentageText = (rated, unrated) => {
  const total = rated + unrated;
  if (total === 0) return ' (0%)';
  return ' (' + Math.round((unrated / total) * 100) + '%)';
};

export function RatingsSummary({ state, t }) {
  if (state.isStatsLoading) {
    return (
      <Stack gap="md" fullWidth>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx} variant="interactive-glass" className="u-min-h-card-loading">
            <Skeleton variant="title-sm" />
            <Skeleton variant="text" />
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {/* CARD 1: Media Average Ratings */}
      <Card
        variant="interactive-glass"
        padding="md"
        divider
        eyebrow={t('ratings.stats.mediaAverages', { defaultValue: 'Average Ratings' })}
        actions={<BarChart2 size={16} className="icon-glow-blue" />}
      >
        <Stack gap="sm" justify="center">
          {/* Movies Row */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('ratings.subtabs.movies', { defaultValue: 'Movies' })}
            </Text>
            <Inline gap="md" align="center">
              <Text variant="title" color="primary" weight="bold">{state.moviesStats.average}</Text>
              <SegmentedRating
                readonly
                showLabel={false}
                value={parseFloat(state.moviesStats.average) || 0}
                t={t}
              />
            </Inline>
          </Inline>

          {/* TV Shows Row */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' })}
            </Text>
            <Inline gap="md" align="center">
              <Text variant="title" color="primary" weight="bold">{state.tvStats.average}</Text>
              <SegmentedRating
                readonly
                showLabel={false}
                value={parseFloat(state.tvStats.average) || 0}
                t={t}
              />
            </Inline>
          </Inline>

          {/* Scenes Row */}
          {state.activeSessionMode === 'nsfw' && (
            <Inline gap="md" align="center" justify="between" className="u-min-h-row">
              <Text variant="body" color="muted" weight="medium">
                {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
              </Text>
              <Inline gap="md" align="center">
                <Text variant="title" color="primary" weight="bold">{state.scenesStats.average}</Text>
                <SegmentedRating
                  readonly
                  showLabel={false}
                  value={parseFloat(state.scenesStats.average) || 0}
                  t={t}
                />
              </Inline>
            </Inline>
          )}

          {/* Videos Row */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('library.tabs.videos') || 'Videos'}
            </Text>
            <Inline gap="md" align="center">
              <Text variant="title" color="primary" weight="bold">{state.videosStats.average}</Text>
              <SegmentedRating
                readonly
                showLabel={false}
                value={parseFloat(state.videosStats.average) || 0}
                t={t}
              />
            </Inline>
          </Inline>
        </Stack>
      </Card>

      {/* CARD 2: Media Counts */}
      <Card
        variant="interactive-glass"
        padding="md"
        divider
        eyebrow={t('ratings.stats.mediaItems', { defaultValue: 'Library Items' })}
        actions={<CheckCircle size={16} className="icon-glow-success" />}
      >
        <Stack gap="sm" justify="center">
          {/* Movies counts */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('ratings.subtabs.movies', { defaultValue: 'Movies' })}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="body" color="primary" weight="semibold">{state.moviesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {state.moviesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(state.moviesStats.totalRated, state.moviesStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>

          {/* TV Shows counts */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' })}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="body" color="primary" weight="semibold">{state.tvStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {state.tvStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(state.tvStats.totalRated, state.tvStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>

          {/* Scenes counts */}
          {state.activeSessionMode === 'nsfw' && (
            <Inline gap="md" align="center" justify="between" className="u-min-h-row">
              <Text variant="body" color="muted" weight="medium">
                {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
              </Text>
              <Inline gap="sm" align="center">
                <Text variant="body" color="primary" weight="semibold">{state.scenesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
                <Text variant="body" color="muted">{bulletSep}</Text>
                <Text variant="body" color="muted">
                  {state.scenesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                  {getPercentageText(state.scenesStats.totalRated, state.scenesStats.totalUnrated)}
                </Text>
              </Inline>
            </Inline>
          )}

          {/* Videos counts */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('library.tabs.videos') || 'Videos'}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="body" color="primary" weight="semibold">{state.videosStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {state.videosStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(state.videosStats.totalRated, state.videosStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>
        </Stack>
      </Card>

      {/* CARD 3: People Stats */}
      <Card
        variant="interactive-glass"
        padding="md"
        divider
        eyebrow={t('ratings.subtabs.people', { defaultValue: 'People' })}
        actions={<Users size={16} className="icon-glow-muted" />}
      >
        <Stack gap="sm" justify="center">
          {/* People Avg Rating */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('ratings.stats.average', { defaultValue: 'Average Rating' })}
            </Text>
            <Inline gap="md" align="center">
              <Text variant="title" color="primary" weight="bold">{state.peopleStats.average}</Text>
              <SegmentedRating
                readonly
                showLabel={false}
                value={parseFloat(state.peopleStats.average) || 0}
                t={t}
              />
            </Inline>
          </Inline>

          {/* People counts */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('ratings.stats.totalRated', { defaultValue: 'Items' })}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="body" color="primary" weight="semibold">{state.peopleStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {state.peopleStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(state.peopleStats.totalRated, state.peopleStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>

          {/* People Favorites */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {state.activeSessionMode === 'nsfw'
                ? (t('ratings.stats.favoritePerformers') || 'Favorite Performers')
                : (t('ratings.stats.favoriteArtists') || 'Favorite Artists')}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="title" color="primary" weight="bold">{state.peopleStats.favoritesCount}</Text>
              <Heart size={14} className="icon-glow-danger" fill="currentColor" />
            </Inline>
          </Inline>
        </Stack>
      </Card>
    </Stack>
  );
}

export function RatingDistribution({
  state,
  t,
  distTabs,
  effectiveDistTab,
  setDistTab
}) {
  if (state.isStatsLoading) {
    return (
      <Card variant="interactive-glass" className="u-min-h-dist-card-loading">
        <Skeleton variant="dist-title" />
        {Array.from({ length: 10 }).map((_, idx) => (
          <Skeleton key={idx} variant="dist-bar" />
        ))}
      </Card>
    );
  }

  return (
    <Card
      variant="interactive-glass"
      divider
      eyebrow={t('ratings.stats.distribution', { defaultValue: 'Rating Distribution' })}
      actions={
        <SegmentedControl
          options={distTabs}
          value={effectiveDistTab}
          onChange={setDistTab}
          variant="filter"
        />
      }
    >
      <Stack gap="sm" className="u-mt-sm">
        {(() => {
          const activeDistStats = 
            effectiveDistTab === 'people' ? state.peopleStats :
            effectiveDistTab === 'tv' ? state.tvStats :
            effectiveDistTab === 'scenes' ? state.scenesStats :
            effectiveDistTab === 'videos' ? state.videosStats :
            state.moviesStats;
          return activeDistStats.distribution.map((count, index) => {
            const maxCount = Math.max(...activeDistStats.distribution, 1);
            const percentage = (count / maxCount) * 100;
            const ratingLabel = ((index + 1) / 2).toString();
            return (
              <div key={index} className={styles['distribution-row']}>
                <span className={styles['rating-label-wrapper']}>
                  <Text variant="small" color="secondary" weight="bold">
                    {ratingLabel}
                  </Text>
                </span>
                <LinearProgress value={percentage} />
                <span className={styles['rating-count-wrapper']}>
                  <Text variant="small" color="muted" weight="medium">
                    {count}
                  </Text>
                </span>
              </div>
            );
          });
        })()}
      </Stack>
    </Card>
  );
}
