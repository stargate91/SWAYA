import { BarChart2, CheckCircle, Users, Heart } from '@/ui/icons';
import SegmentedControl from '@/ui/SegmentedControl';
import Skeleton from '@/ui/Skeleton';
import Inline from '@/ui/Inline';
import './RatingsAnalytics.css';

const bulletSep = '\u2022';

const getPercentageText = (rated, unrated) => {
  const total = rated + unrated;
  if (total === 0) return ' (0%)';
  return ' (' + Math.round((unrated / total) * 100) + '%)';
};

export function RatingsSummary({ state, t }) {
  if (state.isStatsLoading) {
    return (
      <div className="ratings-analytics-loading-summary">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="ratings-analytics-loading-card">
            <Skeleton className="ratings-analytics-loading-skeleton-title" variant="rect" />
            <Skeleton className="ratings-analytics-loading-skeleton-text" variant="text" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="analytics-summary-container">
      {/* CARD 1: Media Average Ratings */}
      <div className="analytics-card compact-stats-card">
        <Inline align="center" className="compact-stats-card__header">
          <span className="analytics-card__title">
            {t('ratings.stats.mediaAverages', { defaultValue: 'Average Ratings' })}
          </span>
          <BarChart2 size={16} className="analytics-card__icon text-accent-blue" />
        </Inline>
        <div className="compact-stats-card__content">
          {/* Movies Row */}
          <Inline gap="md" align="center" className="compact-stats-row">
            <div className="compact-stats-row__label">
              {t('ratings.subtabs.movies', { defaultValue: 'Movies' })}
            </div>
            <Inline gap="md" align="center" className="compact-stats-row__value-wrapper">
              <span className="compact-stats-row__value">{state.moviesStats.average}</span>
              <div className="analytics-mini-segmented-bar">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const avg = parseFloat(state.moviesStats.average) || 0;
                  let fill = 0;
                  if (avg >= val) fill = 100;
                  else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                  return (
                    <div key={val} className="analytics-segment">
                      {/* eslint-disable-next-line react/forbid-dom-props */}
                      <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                    </div>
                  );
                })}
              </div>
            </Inline>
          </Inline>

          {/* TV Shows Row */}
          <Inline gap="md" align="center" className="compact-stats-row">
            <div className="compact-stats-row__label">
              {t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' })}
            </div>
            <Inline gap="md" align="center" className="compact-stats-row__value-wrapper">
              <span className="compact-stats-row__value">{state.tvStats.average}</span>
              <div className="analytics-mini-segmented-bar">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const avg = parseFloat(state.tvStats.average) || 0;
                  let fill = 0;
                  if (avg >= val) fill = 100;
                  else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                  return (
                    <div key={val} className="analytics-segment">
                      {/* eslint-disable-next-line react/forbid-dom-props */}
                      <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                    </div>
                  );
                })}
              </div>
            </Inline>
          </Inline>

          {/* Scenes Row */}
          {state.activeSessionMode === 'nsfw' && (
            <Inline gap="md" align="center" className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
              </div>
              <Inline gap="md" align="center" className="compact-stats-row__value-wrapper">
                <span className="compact-stats-row__value">{state.scenesStats.average}</span>
                <div className="analytics-mini-segmented-bar">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                    const avg = parseFloat(state.scenesStats.average) || 0;
                    let fill = 0;
                    if (avg >= val) fill = 100;
                    else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                    return (
                      <div key={val} className="analytics-segment">
                        {/* eslint-disable-next-line react/forbid-dom-props */}
                        <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                      </div>
                    );
                  })}
                </div>
              </Inline>
            </Inline>
          )}

          {/* Videos Row */}
          <Inline gap="md" align="center" className="compact-stats-row">
            <div className="compact-stats-row__label">
              {t('library.tabs.videos') || 'Videos'}
            </div>
            <Inline gap="md" align="center" className="compact-stats-row__value-wrapper">
              <span className="compact-stats-row__value">{state.videosStats.average}</span>
              <div className="analytics-mini-segmented-bar">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const avg = parseFloat(state.videosStats.average) || 0;
                  let fill = 0;
                  if (avg >= val) fill = 100;
                  else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                  return (
                    <div key={val} className="analytics-segment">
                      {/* eslint-disable-next-line react/forbid-dom-props */}
                      <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                    </div>
                  );
                })}
              </div>
            </Inline>
          </Inline>
        </div>
      </div>

      {/* CARD 2: Media Counts */}
      <div className="analytics-card compact-stats-card">
        <Inline align="center" className="compact-stats-card__header">
          <span className="analytics-card__title">
            {t('ratings.stats.mediaItems', { defaultValue: 'Library Items' })}
          </span>
          <CheckCircle size={16} className="analytics-card__icon text-success" />
        </Inline>
        <div className="compact-stats-card__content">
          {/* Movies counts */}
          <Inline gap="md" align="center" className="compact-stats-row">
            <div className="compact-stats-row__label">
              {t('ratings.subtabs.movies', { defaultValue: 'Movies' })}
            </div>
            <Inline gap="sm" align="center" className="compact-stats-counts">
              <span className="compact-count-rated">{state.moviesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
              <span className="compact-count-sep">{bulletSep}</span>
              <span className="compact-count-unrated">
                {state.moviesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(state.moviesStats.totalRated, state.moviesStats.totalUnrated)}
              </span>
            </Inline>
          </Inline>

          {/* TV Shows counts */}
          <Inline gap="md" align="center" className="compact-stats-row">
            <div className="compact-stats-row__label">
              {t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' })}
            </div>
            <Inline gap="sm" align="center" className="compact-stats-counts">
              <span className="compact-count-rated">{state.tvStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
              <span className="compact-count-sep">{bulletSep}</span>
              <span className="compact-count-unrated">
                {state.tvStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(state.tvStats.totalRated, state.tvStats.totalUnrated)}
              </span>
            </Inline>
          </Inline>

          {/* Scenes counts */}
          {state.activeSessionMode === 'nsfw' && (
            <Inline gap="md" align="center" className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
              </div>
              <Inline gap="sm" align="center" className="compact-stats-counts">
                <span className="compact-count-rated">{state.scenesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                <span className="compact-count-sep">{bulletSep}</span>
                <span className="compact-count-unrated">
                  {state.scenesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                  {getPercentageText(state.scenesStats.totalRated, state.scenesStats.totalUnrated)}
                </span>
              </Inline>
            </Inline>
          )}

          {/* Videos counts */}
          <Inline gap="md" align="center" className="compact-stats-row">
            <div className="compact-stats-row__label">
              {t('library.tabs.videos') || 'Videos'}
            </div>
            <Inline gap="sm" align="center" className="compact-stats-counts">
              <span className="compact-count-rated">{state.videosStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
              <span className="compact-count-sep">{bulletSep}</span>
              <span className="compact-count-unrated">
                {state.videosStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(state.videosStats.totalRated, state.videosStats.totalUnrated)}
              </span>
            </Inline>
          </Inline>
        </div>
      </div>

      {/* CARD 3: People Stats */}
      <div className="analytics-card compact-stats-card">
        <Inline align="center" className="compact-stats-card__header">
          <span className="analytics-card__title">
            {t('ratings.subtabs.people', { defaultValue: 'People' })}
          </span>
          <Users size={16} className="analytics-card__icon text-muted" />
        </Inline>
        <div className="compact-stats-card__content">
          {/* People Avg Rating */}
          <Inline gap="md" align="center" className="compact-stats-row">
            <div className="compact-stats-row__label">
              {t('ratings.stats.average', { defaultValue: 'Average Rating' })}
            </div>
            <Inline gap="md" align="center" className="compact-stats-row__value-wrapper">
              <span className="compact-stats-row__value">{state.peopleStats.average}</span>
              <div className="analytics-mini-segmented-bar">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const avg = parseFloat(state.peopleStats.average) || 0;
                  let fill = 0;
                  if (avg >= val) fill = 100;
                  else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                  return (
                    <div key={val} className="analytics-segment">
                      {/* eslint-disable-next-line react/forbid-dom-props */}
                      <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                    </div>
                  );
                })}
              </div>
            </Inline>
          </Inline>

          {/* People counts */}
          <Inline gap="md" align="center" className="compact-stats-row">
            <div className="compact-stats-row__label">
              {t('ratings.stats.totalRated', { defaultValue: 'Items' })}
            </div>
            <Inline gap="sm" align="center" className="compact-stats-counts">
              <span className="compact-count-rated">{state.peopleStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
              <span className="compact-count-sep">{bulletSep}</span>
              <span className="compact-count-unrated">
                {state.peopleStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                {getPercentageText(state.peopleStats.totalRated, state.peopleStats.totalUnrated)}
              </span>
            </Inline>
          </Inline>

          {/* People Favorites */}
          <Inline gap="md" align="center" className="compact-stats-row">
            <div className="compact-stats-row__label">
              {state.activeSessionMode === 'nsfw'
                ? (t('ratings.stats.favoritePerformers') || 'Favorite Performers')
                : (t('ratings.stats.favoriteArtists') || 'Favorite Artists')}
            </div>
            <Inline gap="sm" align="center" className="compact-stats-favorites">
              <span className="compact-stats-row__value">{state.peopleStats.favoritesCount}</span>
              <Heart size={14} className="analytics-card__icon text-danger" fill="currentColor" />
            </Inline>
          </Inline>
        </div>
      </div>
    </div>
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
      <div className="ratings-analytics-loading-dist">
        <Skeleton className="ratings-analytics-dist-skeleton-title" variant="rect" />
        {Array.from({ length: 10 }).map((_, idx) => (
          <Skeleton key={idx} className="ratings-analytics-dist-skeleton-text" variant="text" />
        ))}
      </div>
    );
  }

  return (
    <div className="analytics-card analytics-card--distribution compact-distribution-card">
      <Inline gap="md" align="center" className="compact-distribution-header">
        <span className="analytics-card__title">
          {t('ratings.stats.distribution', { defaultValue: 'Rating Distribution' })}
        </span>
        <SegmentedControl
          options={distTabs}
          value={effectiveDistTab}
          onChange={setDistTab}
          variant="filter"
        />
      </Inline>
      <div className="analytics-distribution">
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
              <Inline key={index} gap="md" align="center" className="analytics-distribution__row">
                <span className="analytics-distribution__label">{ratingLabel}</span>
                <div className="analytics-distribution__bar-container">
                  <div
                    className="analytics-distribution__bar"
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="analytics-distribution__count">{count}</span>
              </Inline>
            );
          });
        })()}
      </div>
    </div>
  );
}
