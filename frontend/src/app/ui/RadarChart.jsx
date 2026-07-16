import PropTypes from 'prop-types';
import styles from './RadarChart.module.css';

/**
 * Reusable Radar Chart visualization primitive.
 *
 * @param {object} props
 * @param {Array<object>} props.nodes - Plotted nodes containing coordinates
 * @param {Array<object>} props.rings - Concentric ring coordinates
 * @param {string} props.polygonPoints - Main values shape polygon points string
 * @param {string} [props.className] - Optional custom class name
 */
export default function RadarChart({ nodes, rings, polygonPoints, className = '' }) {
  return (
    <svg
      viewBox="0 0 300 300"
      className={`${styles.chart} ${className}`.trim()}
      aria-hidden="true"
    >
      {rings.map((ring) => (
        <polygon
          key={ring.key}
          points={ring.points}
          fill="color-mix(in srgb, var(--color-surface-card) 8%, transparent)"
          stroke="color-mix(in srgb, var(--color-border-subtle) 85%, transparent)"
          strokeWidth="1"
        />
      ))}
      {nodes.map((node) => (
        <line
          key={`axis-${node.id}`}
          x1="150"
          y1="150"
          x2={node.axisX}
          y2={node.axisY}
          stroke="color-mix(in srgb, var(--color-border-subtle) 72%, transparent)"
          strokeWidth="1"
        />
      ))}
      <polygon
        points={polygonPoints}
        fill="color-mix(in srgb, var(--color-accent-blue-soft) 30%, transparent)"
        stroke="var(--color-accent-blue-soft)"
        strokeWidth="2"
        className={styles['value-polygon']}
      />
      {nodes.map((node) => (
        <circle
          key={`point-${node.id}`}
          cx={node.pointX}
          cy={node.pointY}
          r="4"
          fill="var(--color-accent-blue)"
          stroke="var(--color-text-primary)"
          strokeWidth="1.5"
        />
      ))}
      {nodes.map((node) => (
        <text
          key={`label-${node.id}`}
          x={node.labelX}
          y={node.labelY}
          textAnchor={node.labelX < 126 ? 'end' : (node.labelX > 174 ? 'start' : 'middle')}
          fill="var(--color-text-primary)"
          fontSize="var(--font-size-2xs)"
          fontWeight="var(--font-weight-bold)"
        >
          {node.translatedLabel}
        </text>
      ))}
    </svg>
  );
}

RadarChart.propTypes = {
  nodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  rings: PropTypes.arrayOf(PropTypes.object).isRequired,
  polygonPoints: PropTypes.string.isRequired,
  className: PropTypes.string,
};
