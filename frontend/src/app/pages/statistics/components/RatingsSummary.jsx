import { useStatisticsPage } from '../useStatisticsPage';
import { BarChart2, CheckCircle, Users, Heart } from '@/ui/icons';
import Skeleton from '@/ui/Skeleton';
import Inline from '@/ui/Inline';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import SegmentedRating from '@/ui/SegmentedRating';

const bulletSep = '\u2022';

const getPercentageText = (rated, unrated) => {
  const total = rated + unrated;
  if (total === 0) return ' (0%)';
  return ' (' + Math.round((unrated / total) * 100) + '%)';
};

export function RatingsSummary() {
  const { ratingsState, t } = useStatisticsPage();

  if (ratingsState.isStatsLoading) {
    return (
      <Stack gap="md" fullHeight>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx} variant="interactive-glass" className="u-min-h-card-loading u-flex-1">
            <Skeleton variant="title-sm" />
            <Skeleton variant="text" />
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="lg" fullHeight>
      {/* CARD 1: Media Average Ratings */}
      <Card
        variant="interactive-glass"
        padding="md"
        divider
        eyebrow={t('statistics.ratings.mediaAverages', { defaultValue: 'Average Ratings' })}
        actions={<BarChart2 size={16} className="icon-glow-blue" />}
        className="u-flex-1"
      >
        <Stack gap="sm" justify="center" fullHeight>
          {/* Movies Row */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('tabs.movies', { defaultValue: 'Movies' })}
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
              {t('tabs.tvShows', { defaultValue: 'TV Shows' })}
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
                {t('tabs.scenes', { defaultValue: 'Scenes' })}
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
              {t('tabs.videos', { defaultValue: 'Videos' })}
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
        eyebrow={t('statistics.ratings.mediaItems', { defaultValue: 'Library Items' })}
        actions={<CheckCircle size={16} className="icon-glow-success" />}
        className="u-flex-1"
      >
        <Stack gap="sm" justify="center" fullHeight>
          {/* Movies counts */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('tabs.movies', { defaultValue: 'Movies' })}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="body" color="primary" weight="semibold">{ratingsState.moviesStats.totalRated} {t('statistics.ratings.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {ratingsState.moviesStats.totalUnrated} {t('statistics.ratings.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(ratingsState.moviesStats.totalRated, ratingsState.moviesStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>

          {/* TV Shows counts */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('tabs.tvShows', { defaultValue: 'TV Shows' })}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="body" color="primary" weight="semibold">{ratingsState.tvStats.totalRated} {t('statistics.ratings.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {ratingsState.tvStats.totalUnrated} {t('statistics.ratings.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(ratingsState.tvStats.totalRated, ratingsState.tvStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>

          {/* Scenes counts */}
          {ratingsState.activeSessionMode === 'nsfw' && (
            <Inline gap="md" align="center" justify="between" className="u-min-h-row">
              <Text variant="body" color="muted" weight="medium">
                {t('tabs.scenes', { defaultValue: 'Scenes' })}
              </Text>
              <Inline gap="sm" align="center">
                <Text variant="body" color="primary" weight="semibold">{ratingsState.scenesStats.totalRated} {t('statistics.ratings.rated', { defaultValue: 'rated' })}</Text>
                <Text variant="body" color="muted">{bulletSep}</Text>
                <Text variant="body" color="muted">
                  {ratingsState.scenesStats.totalUnrated} {t('statistics.ratings.unrated', { defaultValue: 'unrated' })}
                  {getPercentageText(ratingsState.scenesStats.totalRated, ratingsState.scenesStats.totalUnrated)}
                </Text>
              </Inline>
            </Inline>
          )}

          {/* Videos counts */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('tabs.videos', { defaultValue: 'Videos' })}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="body" color="primary" weight="semibold">{ratingsState.videosStats.totalRated} {t('statistics.ratings.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {ratingsState.videosStats.totalUnrated} {t('statistics.ratings.unrated', { defaultValue: 'unrated' })}
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
        eyebrow={t('tabs.people', { defaultValue: 'People' })}
        actions={<Users size={16} className="icon-glow-muted" />}
        className="u-flex-1"
      >
        <Stack gap="sm" justify="center" fullHeight>
          {/* People Avg Rating */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {t('statistics.ratings.average', { defaultValue: 'Average Rating' })}
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
              {t('statistics.ratings.totalRated', { defaultValue: 'Items' })}
            </Text>
            <Inline gap="sm" align="center">
              <Text variant="body" color="primary" weight="semibold">{ratingsState.peopleStats.totalRated} {t('statistics.ratings.rated', { defaultValue: 'rated' })}</Text>
              <Text variant="body" color="muted">{bulletSep}</Text>
              <Text variant="body" color="muted">
                {ratingsState.peopleStats.totalUnrated} {t('statistics.ratings.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(ratingsState.peopleStats.totalRated, ratingsState.peopleStats.totalUnrated)}
              </Text>
            </Inline>
          </Inline>

          {/* People Favorites */}
          <Inline gap="md" align="center" justify="between" className="u-min-h-row">
            <Text variant="body" color="muted" weight="medium">
              {ratingsState.activeSessionMode === 'nsfw'
                ? (t('statistics.ratings.favoritePerformers') || 'Favorite Performers')
                : (t('statistics.ratings.favoriteArtists') || 'Favorite Artists')}
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
