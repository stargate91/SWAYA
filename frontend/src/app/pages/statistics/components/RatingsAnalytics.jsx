import { useStatisticsPageState } from '../useStatisticsPageState';
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

export function RatingsSummary() {
  const { ratingsState, t } = useStatisticsPageState();

  if (ratingsState.isStatsLoading) {
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
              <Text variant="title" color="primary" weight="bold">{ratingsState.moviesStats.average}</Text>
              <SegmentedRating
                readonly
                showLabel={false}
                value={parseFloat(ratingsState.moviesStats.average) || 0}
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
              <Text variant="title" color="primary" weight="bold">{ratingsState.tvStats.average}</Text>
              <SegmentedRating
                readonly
                showLabel={false}
                value={parseFloat(ratingsState.tvStats.average) || 0}
                t={t}
              />
            </Inline>
          </Inline>

          {/* Scenes Row */}
          {ratingsState.activeSessionMode === 'nsfw' && (
            <Inline gap="md" align="center" justify="between" className="u-min-h-row">
              <Text variant="body" color="muted" weight="medium">
                {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
              </Text>
              <Inline gap="md" align="center">
                <Text variant="title" color="primary" weight="bold">{ratingsState.scenesStats.average}</Text>
                <SegmentedRating
                  readonly
                  showLabel={false}
                  value={parseFloat(ratingsState.scenesStats.average) || 0}
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
              <Text variant="title" color="primary" weight="bold">{ratingsState.videosStats.average}</Text>
              <SegmentedRating
                readonly
                showLabel={false}
                value={parseFloat(ratingsState.videosStats.average) || 0}
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
              <Text variant="body" color="primary" weight="semibold">{ratingsState.moviesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {ratingsState.moviesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(ratingsState.moviesStats.totalRated, ratingsState.moviesStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>

          {/* TV Shows counts */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' })}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="body" color="primary" weight="semibold">{ratingsState.tvStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {ratingsState.tvStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(ratingsState.tvStats.totalRated, ratingsState.tvStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>

          {/* Scenes counts */}
          {ratingsState.activeSessionMode === 'nsfw' && (
            <Inline gap="md" align="center" justify="between" className="u-min-h-row">
              <Text variant="body" color="muted" weight="medium">
                {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
              </Text>
              <Inline gap="sm" align="center">
                <Text variant="body" color="primary" weight="semibold">{ratingsState.scenesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
                <Text variant="body" color="muted">{bulletSep}</Text>
                <Text variant="body" color="muted">
                  {ratingsState.scenesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                  {getPercentageText(ratingsState.scenesStats.totalRated, ratingsState.scenesStats.totalUnrated)}
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
              <Text variant="body" color="primary" weight="semibold">{ratingsState.videosStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {ratingsState.videosStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(ratingsState.videosStats.totalRated, ratingsState.videosStats.totalUnrated)}
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
              <Text variant="title" color="primary" weight="bold">{ratingsState.peopleStats.average}</Text>
              <SegmentedRating
                readonly
                showLabel={false}
                value={parseFloat(ratingsState.peopleStats.average) || 0}
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
              <Text variant="body" color="primary" weight="semibold">{ratingsState.peopleStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {ratingsState.peopleStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(ratingsState.peopleStats.totalRated, ratingsState.peopleStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>

          {/* People Favorites */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {ratingsState.activeSessionMode === 'nsfw'
                ? (t('ratings.stats.favoritePerformers') || 'Favorite Performers')
                : (t('ratings.stats.favoriteArtists') || 'Favorite Artists')}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="title" color="primary" weight="bold">{ratingsState.peopleStats.favoritesCount}</Text>
              <Heart size={14} className="icon-glow-danger" fill="currentColor" />
            </Inline>
          </Inline>
        </Stack>
      </Card>
    </Stack>
  );
}

export function RatingDistribution() {
  const {
    ratingsState,
    t,
    distTabs,
    effectiveDistTab,
    setDistTab,
    activeDistStats,
  } = useStatisticsPageState();

  if (ratingsState.isStatsLoading) {
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
        {activeDistStats?.distributionRows?.map((row, index) => (
          <div key={index} className={styles['distribution-row']}>
            <span className={styles['rating-label-wrapper']}>
              <Text variant="small" color="secondary" weight="bold">
                {row.ratingLabel}
              </Text>
            </span>
            <LinearProgress value={row.percentage} />
            <span className={styles['rating-count-wrapper']}>
              <Text variant="small" color="muted" weight="medium">
                {row.count}
              </Text>
            </span>
          </div>
        ))}
      </Stack>
    </Card>
  );
}
