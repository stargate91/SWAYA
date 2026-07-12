import { useMemo } from 'react';
import PropTypes from 'prop-types';
import WidgetShell from '@/ui/WidgetShell';
import { useStatsQuery } from '../../queries';
import { useLibraryModeStore } from '../../stores/useLibraryModeStore';
import './LibraryInsightsWidget.css';

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

export const LibraryDNA = ({ constellation, genres, insightTitleCount, T }) => {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const isNsfw = sessionMode === 'nsfw';

  const insightData = useMemo(() => {
    const sanitizeNodes = (nodes = []) => (
      nodes.filter((node) => isSingleGenreLabel(node?.label))
    );

    let fallbackNodes = !genres || Object.keys(genres).length === 0
      ? []
      : Object.entries(genres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, RADAR_GENRE_LIMIT + 6)
        .map(([label, count], index) => ({ id: `fallback-${index}`, label, count }));

    let sourceNodes = sanitizeNodes(constellation?.nodes?.length ? constellation.nodes : fallbackNodes);
    
    const isMocked = sourceNodes.length < 3;
    if (isMocked) {
      const mockLabels = isNsfw
        ? ['Anal', 'Blowjob', 'All Sex', 'POV', 'Hardcore', 'Solo']
        : ['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Adventure'];
      
      sourceNodes = mockLabels.map((label, index) => ({
        id: `mock-${index}`,
        label,
        count: 10 - index,
      }));
    }

    const sortedNodes = [...sourceNodes].sort((a, b) => (b.count || 0) - (a.count || 0));
    const nodes = sortedNodes.slice(0, RADAR_GENRE_LIMIT);
    const otherGenres = sortedNodes.slice(RADAR_GENRE_LIMIT).map((node) => ({
      ...node,
      translatedLabel: translateGenreLabel(node.label, T),
    }));
    const center = 150;
    const radius = 92;
    const levels = 4;
    const maxNodeCount = Math.max(...nodes.map((node) => Number(node.count || 0)), 1);
    const plottedNodes = nodes.map((node, index) => {
      const angle = (-Math.PI / 2) + ((Math.PI * 2) / nodes.length) * index;
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
        translatedLabel: translateGenreLabel(node.label, T),
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
      otherGenres: isMocked ? [] : otherGenres,
      maxNodeCount,
      polygonPoints,
      rings,
      isMocked,
    };
  }, [constellation, genres, T, isNsfw]);

  const isMocked = insightData?.isMocked;
  const hasEnoughData = !isMocked && insightTitleCount >= MIN_DNA_TITLES && insightData.nodes.length >= 3;

  return (
    <div className="insights-panel insights-panel--dna">
      <h3 className="insights-panel-title">
        {T('statistics.stats.library_dna') || 'Library DNA'}
      </h3>
      
      <div className={`insights-dna-stage insights-dna-stage--radar ${!hasEnoughData ? 'insights-dna-stage--ghost' : ''}`}>
        <div className="insights-radar-stage">
          <svg viewBox="0 0 300 300" className="insights-radar-svg" aria-hidden="true">
            {insightData.rings.map((ring) => (
              <polygon key={ring.key} points={ring.points} className="insights-radar-ring" />
            ))}
            {insightData.nodes.map((node) => (
              <line
                key={`axis-${node.id}`}
                x1="150"
                y1="150"
                x2={node.axisX}
                y2={node.axisY}
                className="insights-radar-axis"
              />
            ))}
            <polygon points={insightData.polygonPoints} className="insights-radar-shape" />
            {insightData.nodes.map((node) => (
              <circle
                key={`point-${node.id}`}
                cx={node.pointX}
                cy={node.pointY}
                r="4"
                className="insights-radar-point"
              />
            ))}
            {insightData.nodes.map((node) => (
              <text
                key={`label-${node.id}`}
                x={node.labelX}
                y={node.labelY}
                textAnchor={node.labelX < 126 ? 'end' : (node.labelX > 174 ? 'start' : 'middle')}
                className="insights-radar-label"
              >
                {node.translatedLabel}
              </text>
            ))}
          </svg>
        </div>

        {hasEnoughData && (
          <div className="insights-radar-legend">
            {insightData.nodes.map((node) => (
              <div
                key={node.id}
                className="insights-radar-legend-row"
                title={T('statistics.stats.items_count_tooltip', { label: node.translatedLabel, count: node.count }) || `${node.translatedLabel}: ${node.count}`}
              >
                <span className="insights-radar-legend-label">{node.translatedLabel}</span>
                <strong className="insights-radar-legend-count">{node.count}</strong>
              </div>
            ))}

            {insightData.otherGenres.length > 0 && (
              <div className="insights-radar-other">
                <span className="insights-radar-other__title">{T('statistics.stats.other_genres') || 'Other Genres'}</span>
                <div className="insights-radar-other__list">
                  {insightData.otherGenres.map((node) => (
                    <span
                      key={`other-${node.id}`}
                      className="insights-radar-other__chip"
                      title={T('statistics.stats.items_count_tooltip', { label: node.translatedLabel, count: node.count }) || `${node.translatedLabel}: ${node.count}`}
                    >
                      {node.translatedLabel} {node.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!hasEnoughData && (
        <div className="insights-overlay-card">
          <div className="insights-overlay-icon-wrapper insights-overlay-icon-wrapper--dna">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="insights-overlay-icon">
              <path d="M4.5 10.5C4.5 7.46243 6.96243 5 10 5C13.0376 5 15.5 7.46243 15.5 10.5M19.5 13.5C19.5 16.5376 17.0376 19 14 19C10.9624 19 8.5 16.5376 8.5 13.5" />
              <path d="M4.5 10.5L8.5 13.5M15.5 10.5L19.5 13.5" />
              <path d="M10 5L14 19" />
            </svg>
          </div>
          <h4 className="insights-overlay-title">
            {T('statistics.stats.dna_overlay_title') || 'Library DNA Blueprint'}
          </h4>
          <p className="insights-overlay-copy">
            {isNsfw
              ? (T('statistics.stats.dna_overlay_copy_nsfw') || 'Match and organize adult scenes to map your library\'s NSFW genre footprint.')
              : (T('statistics.stats.dna_overlay_copy_sfw') || 'Scan and match SFW movies to reveal your library\'s unique genre DNA blueprint.')}
          </p>
          <div className="insights-overlay-progress">
            <div className="insights-overlay-progress-header">
              <span className="insights-overlay-progress-text">
                {T('statistics.stats.dna_progress_text', { count: insightTitleCount, limit: MIN_DNA_TITLES }) || `${insightTitleCount} of ${MIN_DNA_TITLES} titles`}
              </span>
            </div>
            <div className="insights-overlay-progress-track">
              <div 
                className="insights-overlay-progress-bar"
                style={{ width: `${Math.min(100, (insightTitleCount / MIN_DNA_TITLES) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

LibraryDNA.propTypes = {
  constellation: PropTypes.object,
  genres: PropTypes.object,
  insightTitleCount: PropTypes.number.isRequired,
  T: PropTypes.func.isRequired,
};

export const TimeTravelTimeline = ({ decades, insightTitleCount, T }) => {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const isNsfw = sessionMode === 'nsfw';

  const { sorted, maxCount, topDecade, topDecadeLabel, isMocked } = useMemo(() => {
    let mockDecades = decades;
    const isMocked = !decades || Object.keys(decades).length < 2;
    if (isMocked) {
      mockDecades = {
        '1980s': 3,
        '1990s': 6,
        '2000s': 12,
        '2010s': 8,
        '2020s': 5
      };
    }
    const sorted = Object.entries(mockDecades).sort((a, b) => a[0].localeCompare(b[0]));
    const maxCount = Math.max(...sorted.map(([, count]) => count), 1);
    const topDecade = [...sorted].sort((a, b) => b[1] - a[1])[0][0];
    
    const formatDecade = (decade) => {
      const match = String(decade || '').match(/^(\d{4})s$/);
      return match ? T('statistics.stats.decade_label', { decade: match[1] }) || `${match[1]}s` : decade;
    };
    const topDecadeLabel = formatDecade(topDecade);

    return {
      sorted,
      maxCount,
      topDecade,
      topDecadeLabel,
      isMocked
    };
  }, [decades, T]);

  const hasEnoughData = !isMocked && insightTitleCount >= MIN_TIMELINE_TITLES && sorted.length >= 2;

  const formatDecade = (decade) => {
    const match = String(decade || '').match(/^(\d{4})s$/);
    return match ? T('statistics.stats.decade_label', { decade: match[1] }) || `${match[1]}s` : decade;
  };

  return (
    <div className="insights-panel insights-panel--timeline">
      <h3 className="insights-panel-title">
        {T('statistics.stats.timeline') || 'Time Travel'}
      </h3>
      {hasEnoughData && (
        <p className="insights-panel-subtitle">
          {T('statistics.stats.top_decade', { decade: topDecadeLabel }) || `Most files are from the ${topDecadeLabel}`}
        </p>
      )}

      <div className={`insights-timeline-stage ${!hasEnoughData ? 'insights-timeline-stage--ghost' : ''}`}>
        <div className="insights-timeline">
          {sorted.map(([decade, count]) => {
            const heightPct = Math.max(5, (count / maxCount) * 100);
            const decadeLabel = formatDecade(decade);
            return (
              <div key={decade} className="insights-timeline-column">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="insights-timeline-bar-shell">
                  <rect
                    x="0"
                    y={100 - heightPct}
                    width="100"
                    height={heightPct}
                    rx="6"
                    ry="6"
                    className="insights-timeline-bar"
                  >
                    <title>{T('statistics.stats.items_count_tooltip', { label: decadeLabel, count }) || `${decadeLabel}: ${count} files`}</title>
                  </rect>
                </svg>
                <div className="insights-timeline-label">
                  {decadeLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!hasEnoughData && (
        <div className="insights-overlay-card">
          <div className="insights-overlay-icon-wrapper insights-overlay-icon-wrapper--timeline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="insights-overlay-icon">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h4 className="insights-overlay-title">
            {T('statistics.stats.timeline_overlay_title') || 'Time-Travel Timeline'}
          </h4>
          <p className="insights-overlay-copy">
            {isNsfw
              ? (T('statistics.stats.timeline_overlay_copy_nsfw') || 'Match more adult scenes to build a chronological timeline of your collection.')
              : (T('statistics.stats.timeline_overlay_copy_sfw') || 'Add more movies to map your collection across the history of cinema.')}
          </p>
          <div className="insights-overlay-progress">
            <div className="insights-overlay-progress-header">
              <span className="insights-overlay-progress-text">
                {T('statistics.stats.timeline_progress_text', { count: insightTitleCount, limit: MIN_TIMELINE_TITLES }) || `${insightTitleCount} of ${MIN_TIMELINE_TITLES} items`}
              </span>
            </div>
            <div className="insights-overlay-progress-track">
              <div 
                className="insights-overlay-progress-bar"
                style={{ width: `${Math.min(100, (insightTitleCount / MIN_TIMELINE_TITLES) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

TimeTravelTimeline.propTypes = {
  decades: PropTypes.object,
  insightTitleCount: PropTypes.number.isRequired,
  T: PropTypes.func.isRequired,
};

const LibraryInsightsWidget = ({ T, showDna = true, showTimeline = true }) => {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: stats = {}, isLoading } = useStatsQuery(sessionMode === 'nsfw');
  const insightTitleCount = useMemo(
    () => Object.values(stats?.decade_distribution || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [stats?.decade_distribution]
  );

  return (
    <WidgetShell loading={isLoading} size="lg" transparent={true}>
      <div className="insights-layout">
        {showDna && (
          <LibraryDNA
            constellation={stats?.genre_constellation}
            genres={stats?.genre_distribution}
            insightTitleCount={insightTitleCount}
            T={T}
          />
        )}
        {showTimeline && (
          <TimeTravelTimeline
            decades={stats?.decade_distribution}
            insightTitleCount={insightTitleCount}
            T={T}
          />
        )}
      </div>
    </WidgetShell>
  );
};

LibraryInsightsWidget.propTypes = {
  T: PropTypes.func.isRequired,
  showDna: PropTypes.bool,
  showTimeline: PropTypes.bool,
};

export default LibraryInsightsWidget;
