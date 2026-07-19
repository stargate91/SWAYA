import { useMemo } from 'react';
import { useStatisticsPageState } from './useStatisticsPageState';
import Inline from '@/ui/Inline';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import LinearProgress from '@/ui/LinearProgress';
import RadarChart from '@/ui/RadarChart';
import BarChart from '@/ui/BarChart';

const translateGenreLabel = (label, T) => {
  if (!label) return '';
  const genreKey = `library.genres.${label}`;
  const translated = T(genreKey);
  return (translated && translated !== genreKey) ? translated : label;
};

const isSingleGenreLabel = (label) => {
  const normalized = String(label || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes('&')) return false;
  if (normalized.includes('/')) return false;
  if (normalized.includes(',')) return false;
  if (/\b(and|és)\b/.test(normalized)) return false;
  return true;
};

const RADAR_GENRE_LIMIT = 6;
const MIN_DNA_TITLES = 4;
const MIN_TIMELINE_TITLES = 5;

// Shared styles to achieve 0 lines of CSS in the widget module
const STAGE_STYLE_BASE = {
  position: 'relative',
  minHeight: '13.75rem',
  overflow: 'hidden',
  borderRadius: 'var(--radius-xl)',
  background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--color-accent-blue-soft) 14%, transparent), color-mix(in srgb, var(--color-accent-blue) 4%, transparent) 35%, color-mix(in srgb, var(--color-bg-elevated) 8%, transparent) 70%, transparent 100%)',
};

const GHOST_STYLE = {
  opacity: 0.15,
  filter: 'grayscale(1) blur(0.03125rem)',
  pointerEvents: 'none',
  transition: 'opacity var(--motion-duration-emphasized) var(--motion-ease-ease), filter var(--motion-duration-emphasized) var(--motion-ease-ease)',
};

const OVERLAY_CARD_STYLE = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-2xl) var(--space-xl)',
  background: 'radial-gradient(circle at center, color-mix(in srgb, var(--color-bg-elevated) 72%, transparent) 0%, var(--color-surface-overlay-heavy) 100%)',
  backdropFilter: 'var(--glass-blur-md)',
  zIndex: 'var(--z-index-step-2)',
  textAlign: 'center',
};

export const LibraryDNA = () => {
  const { dnaData, t: T, sessionMode, insightTitleCount, MIN_DNA_TITLES } = useStatisticsPageState();
  const isNsfw = sessionMode === 'nsfw';

  const plotted = useMemo(() => {
    const center = 150;
    const radius = 92;
    const levels = 4;
    const maxNodeCount = Math.max(...dnaData.nodes.map((node) => Number(node.count || 0)), 1);
    const plottedNodes = dnaData.nodes.map((node, index) => {
      const angle = (-Math.PI / 2) + ((Math.PI * 2) / dnaData.nodes.length) * index;
      const valueRatio = Number(node.count || 0) / maxNodeCount;
      const pointRadius = radius * valueRatio;
      const axisX = center + Math.cos(angle) * radius;
      const axisY = center + Math.sin(angle) * radius;
      const pointX = center + Math.cos(angle) * pointRadius;
      const pointY = center + Math.sin(angle) * pointRadius;
      const labelRadius = radius + 34;
      const labelX = center + Math.cos(angle) * labelRadius;
      const labelY = center + Math.sin(angle) * labelRadius;

      return {
        ...node,
        angle,
        axisX,
        axisY,
        pointX,
        pointY,
        labelX,
        labelY,
        valueRatio,
      };
    });

    const polygonPoints = plottedNodes.map((node) => `${node.pointX},${node.pointY}`).join(' ');
    const rings = Array.from({ length: levels }, (_, index) => {
      const ringRadius = radius * ((index + 1) / levels);
      const points = plottedNodes.map((node) => {
        const x = center + Math.cos(node.angle) * ringRadius;
        const y = center + Math.sin(node.angle) * ringRadius;
        return `${x},${y}`;
      }).join(' ');
      return {
        key: `ring-${index + 1}`,
        points,
      };
    });

    return {
      nodes: plottedNodes,
      polygonPoints,
      rings,
    };
  }, [dnaData.nodes]);

  const stageStyle = useMemo(() => ({
    ...STAGE_STYLE_BASE,
    padding: 'var(--space-lg)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.35fr) minmax(11.25rem, 0.8fr)',
    gap: 'var(--space-xl)',
    alignItems: 'center',
    ...(!dnaData.hasEnoughData ? GHOST_STYLE : {})
  }), [dnaData.hasEnoughData]);

  return (
    <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1} className="u-insights-panel">
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <Text variant="title" color="primary" weight="extrabold" as="h3">
          {T('statistics.stats.library_dna') || 'Library DNA'}
        </Text>
      </div>
      
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div style={stageStyle}>
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <RadarChart
            nodes={plotted.nodes}
            rings={plotted.rings}
            polygonPoints={plotted.polygonPoints}
          />
        </div>

        {dnaData.hasEnoughData && (
          <Stack gap="sm">
            {dnaData.nodes.map((node) => (
              <Card key={node.id} variant="flat-glass" padding="none">
                {/* eslint-disable-next-line react/forbid-dom-props */}
                <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                  <Inline
                    gap="md"
                    align="center"
                    justify="between"
                    title={T('statistics.stats.items_count_tooltip', { label: node.translatedLabel, count: node.count }) || `${node.translatedLabel}: ${node.count}`}
                  >
                    <Text variant="small" color="primary" weight="bold">
                      {node.translatedLabel}
                    </Text>
                    <Text variant="small" color="accent" weight="extrabold" as="strong">
                      {node.count}
                    </Text>
                  </Inline>
                </div>
              </Card>
            ))}

            {dnaData.otherGenres.length > 0 && (
              // eslint-disable-next-line react/forbid-dom-props
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-xs)' }}>
                <Text variant="caption" color="secondary" weight="extrabold" uppercase as="span">
                  {T('statistics.stats.other_genres') || 'Other Genres'}
                </Text>
                <Inline gap="sm">
                  {dnaData.otherGenres.map((node) => (
                    <span
                      key={`other-${node.id}`}
                      // eslint-disable-next-line react/forbid-dom-props
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: '1.875rem',
                        padding: '0 var(--space-md)',
                        border: '1px solid color-mix(in srgb, var(--color-border-subtle) 88%, transparent)',
                        borderRadius: 'var(--radius-full)',
                        background: 'color-mix(in srgb, var(--color-surface-card) 52%, transparent)',
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-2xs)',
                        fontWeight: 'var(--font-weight-bold)'
                      }}
                      title={T('statistics.stats.items_count_tooltip', { label: node.translatedLabel, count: node.count }) || `${node.translatedLabel}: ${node.count}`}
                    >
                      {node.translatedLabel} {node.count}
                    </span>
                  ))}
                </Inline>
              </div>
            )}
          </Stack>
        )}
      </div>

      {!dnaData.hasEnoughData && (
        // eslint-disable-next-line react/forbid-dom-props
        <div style={OVERLAY_CARD_STYLE}>
          <div className="u-insights-overlay-icon-wrapper u-insights-overlay-icon-wrapper--dna">
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 'var(--space-2xl)', height: 'var(--space-2xl)' }}>
              <path d="M4.5 10.5C4.5 7.46243 6.96243 5 10 5C13.0376 5 15.5 7.46243 15.5 10.5M19.5 13.5C19.5 16.5376 17.0376 19 14 19C10.9624 19 8.5 16.5376 8.5 13.5" />
              <path d="M4.5 10.5L8.5 13.5M15.5 10.5L19.5 13.5" />
              <path d="M10 5L14 19" />
            </svg>
          </div>
          {/* eslint-disable-next-line react/forbid-dom-props */}
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <Text variant="body" color="primary" weight="extrabold" as="h4">
              {T('statistics.stats.dna_overlay_title') || 'Library DNA Blueprint'}
            </Text>
          </div>
          {/* eslint-disable-next-line react/forbid-dom-props */}
          <p style={{ margin: '0 0 var(--space-md) 0', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', lineHeight: '1.5', maxWidth: '16.25rem' }}>
            {isNsfw
              ? (T('statistics.stats.dna_overlay_copy_nsfw') || 'Match and organize adult scenes to map your library\'s NSFW genre footprint.')
              : (T('statistics.stats.dna_overlay_copy_sfw') || 'Scan and match SFW movies to reveal your library\'s unique genre DNA blueprint.')}
          </p>
          {/* eslint-disable-next-line react/forbid-dom-props */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%', maxWidth: '11.25rem', alignItems: 'center' }}>
            <Inline justify="center">
              <Text variant="caption" color="secondary" weight="extrabold" uppercase>
                {T('statistics.stats.dna_progress_text', { count: insightTitleCount, limit: MIN_DNA_TITLES }) || `${insightTitleCount} of ${MIN_DNA_TITLES} titles`}
              </Text>
            </Inline>
            <LinearProgress
              value={(insightTitleCount / MIN_DNA_TITLES) * 100}
              variant="dna"
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export const TimeTravelTimeline = () => {
  const { timelineData, t: T, sessionMode, insightTitleCount, MIN_TIMELINE_TITLES } = useStatisticsPageState();
  const isNsfw = sessionMode === 'nsfw';

  const stageStyle = useMemo(() => ({
    ...STAGE_STYLE_BASE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(!timelineData.hasEnoughData ? GHOST_STYLE : {})
  }), [timelineData.hasEnoughData]);

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
      <div style={stageStyle}>
        <BarChart
          sortedData={timelineData.sorted}
          maxCount={timelineData.maxCount}
          T={T}
          formatDecade={timelineData.formatDecade}
        />
      </div>

      {!timelineData.hasEnoughData && (
        // eslint-disable-next-line react/forbid-dom-props
        <div style={OVERLAY_CARD_STYLE}>
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
                {T('statistics.stats.timeline_progress_text', { count: insightTitleCount, limit: MIN_TIMELINE_TITLES }) || `${insightTitleCount} of ${MIN_TIMELINE_TITLES} items`}
              </Text>
            </Inline>
            <LinearProgress
              value={(insightTitleCount / MIN_TIMELINE_TITLES) * 100}
              variant="timeline"
            />
          </div>
        </div>
      )}
    </Card>
  );
};

