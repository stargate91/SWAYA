import { useMemo } from 'react';
import { useStatisticsPage } from '../useStatisticsPage';
import Inline from '@/ui/Inline';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import LinearProgress from '@/ui/LinearProgress';
import RadarChart from '@/ui/RadarChart';
import styles from './LibraryInsightsShared.module.css';

export const LibraryDNA = () => {
  const { dnaData, t: T, sessionMode, dnaProgressCount, MIN_DNA_TITLES } = useStatisticsPage();
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

  const wrapperClass = `${styles['stage-base']} ${!dnaData.hasEnoughData ? styles['ghost'] : ''}`.trim();

  return (
    <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1} className="u-insights-panel">
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <Text variant="title" color="primary" weight="extrabold" as="h3">
          {T('statistics.stats.library_dna') || 'Library DNA'}
        </Text>
      </div>
      
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div className={wrapperClass} style={{ padding: 'var(--space-lg)', display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(11.25rem, 0.8fr)', gap: 'var(--space-xl)', alignItems: 'center' }}>
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
        <div className={styles['overlay-card']}>
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
                {T('statistics.stats.dna_progress_text', { count: dnaProgressCount, limit: MIN_DNA_TITLES }) || `${dnaProgressCount} of ${MIN_DNA_TITLES} titles`}
              </Text>
            </Inline>
            <LinearProgress
              value={(dnaProgressCount / MIN_DNA_TITLES) * 100}
              variant="dna"
            />
          </div>
        </div>
      )}
    </Card>
  );
};
