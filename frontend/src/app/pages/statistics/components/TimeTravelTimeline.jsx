import { useStatisticsPage } from '../useStatisticsPage';
import Inline from '@/ui/Inline';
import Card from '@/ui/Card';
import Text from '@/ui/Text';
import LinearProgress from '@/ui/LinearProgress';
import BarChart from '@/ui/BarChart';
import styles from './LibraryInsightsShared.module.css';

export const TimeTravelTimeline = () => {
  const { timelineData, t: T, sessionMode, timelineProgressCount, MIN_TIMELINE_TITLES } = useStatisticsPage();
  const isNsfw = sessionMode === 'nsfw';

  const wrapperClass = `${styles['stage-base']} ${!timelineData.hasEnoughData ? styles['ghost'] : ''}`.trim();

  return (
    <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1} className="u-insights-panel">
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <Text variant="title" color="primary" weight="extrabold" as="h3">
          {T('statistics.stats.timeline') || 'Time Travel'}
        </Text>
      </div>
      {timelineData.hasEnoughData && (
        // eslint-disable-next-line react/forbid-dom-props
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <Text variant="body" color="accent" weight="semibold" as="p">
            {T('statistics.stats.top_decade', { decade: timelineData.topDecadeLabel }) || `Most files are from the ${timelineData.topDecadeLabel}`}
          </Text>
        </div>
      )}

      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div className={wrapperClass} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BarChart
          sortedData={timelineData.sorted}
          maxCount={timelineData.maxCount}
          T={T}
          formatDecade={timelineData.formatDecade}
        />
      </div>

      {!timelineData.hasEnoughData && (
        <div className={styles['overlay-card']}>
          <div className="u-insights-overlay-icon-wrapper u-insights-overlay-icon-wrapper--timeline">
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 'var(--space-2xl)', height: 'var(--space-2xl)' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          {/* eslint-disable-next-line react/forbid-dom-props */}
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <Text variant="body" color="primary" weight="extrabold" as="h4">
              {T('statistics.stats.timeline_overlay_title') || 'Time-Travel Timeline'}
            </Text>
          </div>
          {/* eslint-disable-next-line react/forbid-dom-props */}
          <p style={{ margin: '0 0 var(--space-md) 0', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', lineHeight: '1.5', maxWidth: '16.25rem' }}>
            {isNsfw
              ? (T('statistics.stats.timeline_overlay_copy_nsfw') || 'Match more adult scenes to build a chronological timeline of your collection.')
              : (T('statistics.stats.timeline_overlay_copy_sfw') || 'Add more movies to map your collection across the history of cinema.')}
          </p>
          {/* eslint-disable-next-line react/forbid-dom-props */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%', maxWidth: '11.25rem', alignItems: 'center' }}>
            <Inline justify="center">
              <Text variant="caption" color="secondary" weight="extrabold" uppercase>
                {T('statistics.stats.timeline_progress_text', { count: timelineProgressCount, limit: MIN_TIMELINE_TITLES }) || `${timelineProgressCount} of ${MIN_TIMELINE_TITLES} items`}
              </Text>
            </Inline>
            <LinearProgress
              value={(timelineProgressCount / MIN_TIMELINE_TITLES) * 100}
              variant="timeline"
            />
          </div>
        </div>
      )}
    </Card>
  );
};
