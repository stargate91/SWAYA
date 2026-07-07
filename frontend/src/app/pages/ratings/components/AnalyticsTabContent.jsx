/* eslint-disable react/forbid-dom-props */
import { BarChart2, CheckCircle, Users, Heart } from '@/ui/icons';
import SegmentedControl from '@/ui/SegmentedControl';
import Spinner from '@/ui/Spinner';

const bulletSep = '\u2022';

const getPercentageText = (rated, unrated) => {
  const total = rated + unrated;
  if (total === 0) return ' (0%)';
  return ' (' + Math.round((rated / total) * 100) + '%)';
};

export default function AnalyticsTabContent({
  state,
  t,
  distTabs,
  effectiveDistTab,
  setDistTab
}) {
  if (state.isStatsLoading) {
    return (
      <div className="ratings-loading-container">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="analytics-dashboard-compact">
      <div className="analytics-dashboard-left">
        {/* CARD 1: Media Average Ratings */}
        <div className="analytics-card compact-stats-card">
          <div className="compact-stats-card__header">
            <span className="analytics-card__title">
              {t('ratings.stats.mediaAverages', { defaultValue: 'Average Ratings' })}
            </span>
            <BarChart2 size={16} className="analytics-card__icon text-accent-blue" />
          </div>
          <div className="compact-stats-card__content">
            {/* Movies Row */}
            <div className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('ratings.subtabs.movies', { defaultValue: 'Movies' })}
              </div>
              <div className="compact-stats-row__value-wrapper">
                <span className="compact-stats-row__value">{state.moviesStats.average}</span>
                <div className="analytics-mini-segmented-bar">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                    const avg = parseFloat(state.moviesStats.average) || 0;
                    let fill = 0;
                    if (avg >= val) fill = 100;
                    else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                    return (
                      <div key={val} className="analytics-segment">
                        <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* TV Shows Row */}
            <div className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' })}
              </div>
              <div className="compact-stats-row__value-wrapper">
                <span className="compact-stats-row__value">{state.tvStats.average}</span>
                <div className="analytics-mini-segmented-bar">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                    const avg = parseFloat(state.tvStats.average) || 0;
                    let fill = 0;
                    if (avg >= val) fill = 100;
                    else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                    return (
                      <div key={val} className="analytics-segment">
                        <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scenes Row */}
            {state.hasAdultSupport && (
              <div className="compact-stats-row">
                <div className="compact-stats-row__label">
                  {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
                </div>
                <div className="compact-stats-row__value-wrapper">
                  <span className="compact-stats-row__value">{state.scenesStats.average}</span>
                  <div className="analytics-mini-segmented-bar">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                      const avg = parseFloat(state.scenesStats.average) || 0;
                      let fill = 0;
                      if (avg >= val) fill = 100;
                      else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                      return (
                        <div key={val} className="analytics-segment">
                          <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Videos Row */}
            <div className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('library.tabs.videos') || 'Videos'}
              </div>
              <div className="compact-stats-row__value-wrapper">
                <span className="compact-stats-row__value">{state.videosStats.average}</span>
                <div className="analytics-mini-segmented-bar">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                    const avg = parseFloat(state.videosStats.average) || 0;
                    let fill = 0;
                    if (avg >= val) fill = 100;
                    else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                    return (
                      <div key={val} className="analytics-segment">
                        <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Media Counts */}
        <div className="analytics-card compact-stats-card">
          <div className="compact-stats-card__header">
            <span className="analytics-card__title">
              {t('ratings.stats.mediaItems', { defaultValue: 'Library Items' })}
            </span>
            <CheckCircle size={16} className="analytics-card__icon text-success" />
          </div>
          <div className="compact-stats-card__content">
            {/* Movies counts */}
            <div className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('ratings.subtabs.movies', { defaultValue: 'Movies' })}
              </div>
              <div className="compact-stats-counts">
                <span className="compact-count-rated">{state.moviesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                <span className="compact-count-sep">{bulletSep}</span>
                <span className="compact-count-unrated">
                  {state.moviesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                  {getPercentageText(state.moviesStats.totalRated, state.moviesStats.totalUnrated)}
                </span>
              </div>
            </div>

            {/* TV Shows counts */}
            <div className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' })}
              </div>
              <div className="compact-stats-counts">
                <span className="compact-count-rated">{state.tvStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                <span className="compact-count-sep">{bulletSep}</span>
                <span className="compact-count-unrated">
                  {state.tvStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                  {getPercentageText(state.tvStats.totalRated, state.tvStats.totalUnrated)}
                </span>
              </div>
            </div>

            {/* Scenes counts */}
            {state.hasAdultSupport && (
              <div className="compact-stats-row">
                <div className="compact-stats-row__label">
                  {t('ratings.subtabs.scenes', { defaultValue: 'Scenes' })}
                </div>
                <div className="compact-stats-counts">
                  <span className="compact-count-rated">{state.scenesStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                  <span className="compact-count-sep">{bulletSep}</span>
                  <span className="compact-count-unrated">
                    {state.scenesStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                    {getPercentageText(state.scenesStats.totalRated, state.scenesStats.totalUnrated)}
                  </span>
                </div>
              </div>
            )}

            {/* Videos counts */}
            <div className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('library.tabs.videos') || 'Videos'}
              </div>
              <div className="compact-stats-counts">
                <span className="compact-count-rated">{state.videosStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                <span className="compact-count-sep">{bulletSep}</span>
                <span className="compact-count-unrated">
                  {state.videosStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                  {getPercentageText(state.videosStats.totalRated, state.videosStats.totalUnrated)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: People Stats */}
        <div className="analytics-card compact-stats-card">
          <div className="compact-stats-card__header">
            <span className="analytics-card__title">
              {t('ratings.subtabs.people', { defaultValue: 'People' })}
            </span>
            <Users size={16} className="analytics-card__icon text-muted" />
          </div>
          <div className="compact-stats-card__content">
            {/* People Avg Rating */}
            <div className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('ratings.stats.average', { defaultValue: 'Average Rating' })}
              </div>
              <div className="compact-stats-row__value-wrapper">
                <span className="compact-stats-row__value">{state.peopleStats.average}</span>
                <div className="analytics-mini-segmented-bar">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                    const avg = parseFloat(state.peopleStats.average) || 0;
                    let fill = 0;
                    if (avg >= val) fill = 100;
                    else if (avg > val - 1) fill = (avg - (val - 1)) * 100;
                    return (
                      <div key={val} className="analytics-segment">
                        <div className="analytics-segment-fill" style={{ width: `${fill}%` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* People counts */}
            <div className="compact-stats-row">
              <div className="compact-stats-row__label">
                {t('ratings.stats.totalRated', { defaultValue: 'Items' })}
              </div>
              <div className="compact-stats-counts">
                <span className="compact-count-rated">{state.peopleStats.totalRated} {t('ratings.stats.rated', { defaultValue: 'rated' })}</span>
                <span className="compact-count-sep">{bulletSep}</span>
                <span className="compact-count-unrated">
                  {state.peopleStats.totalUnrated} {t('ratings.stats.unrated', { defaultValue: 'unrated' })}
                  {getPercentageText(state.peopleStats.totalRated, state.peopleStats.totalUnrated)}
                </span>
              </div>
            </div>

            {/* People Favorites */}
            <div className="compact-stats-row">
              <div className="compact-stats-row__label">
                {state.activeSessionMode === 'nsfw'
                  ? (t('ratings.stats.favoritePerformers') || 'Favorite Performers')
                  : (t('ratings.stats.favoriteArtists') || 'Favorite Artists')}
              </div>
              <div className="compact-stats-favorites">
                <span className="compact-stats-row__value">{state.peopleStats.favoritesCount}</span>
                <Heart size={14} className="analytics-card__icon text-danger" fill="currentColor" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-dashboard-right">
        {/* CARD 4: Rating Distribution with Tabs */}
        <div className="analytics-card analytics-card--distribution compact-distribution-card">
          <div className="compact-distribution-header">
            <span className="analytics-card__title">
              {t('ratings.stats.distribution', { defaultValue: 'Rating Distribution' })}
            </span>
            <SegmentedControl
              options={distTabs}
              value={effectiveDistTab}
              onChange={setDistTab}
              variant="filter"
            />
          </div>
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
                  <div key={index} className="analytics-distribution__row">
                    <span className="analytics-distribution__label">{ratingLabel}</span>
                    <div className="analytics-distribution__bar-container">
                      <div
                        className="analytics-distribution__bar"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="analytics-distribution__count">{count}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
