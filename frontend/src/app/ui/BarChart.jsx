import PropTypes from 'prop-types';
import Text from './Text';

/**
 * Reusable vertical Bar Chart visualization primitive.
 *
 * @param {object} props
 * @param {Array<Array<string | number>>} props.sortedData - Sorted 2D array of [label, value] pairs
 * @param {number} props.maxCount - The maximum value for rendering full height
 * @param {Function} props.T - Translation function
 * @param {Function} props.formatDecade - Helper function to format decade label
 */
export default function BarChart({ sortedData, maxCount, T, formatDecade }) {
  return (
    // eslint-disable-next-line react/forbid-dom-props
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-lg)', minHeight: '13.75rem', paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-3xl)', borderBottom: '2px solid var(--color-border-subtle)' }}>
      {sortedData.map(([label, count]) => {
        const heightPct = Math.max(5, (count / maxCount) * 100);
        const formattedLabel = formatDecade(label);
        return (
          // eslint-disable-next-line react/forbid-dom-props
          <div key={label} style={{ position: 'relative', display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 'var(--space-md)' }}>
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}>
              <rect
                x="0"
                y={100 - heightPct}
                width="100"
                height={heightPct}
                rx="6"
                ry="6"
                fill="color-mix(in srgb, var(--color-accent-blue-soft) 90%, transparent)"
                // eslint-disable-next-line react/forbid-dom-props
                style={{ filter: 'drop-shadow(0 0 0.9375rem color-mix(in srgb, var(--color-accent-blue-soft) 30%, transparent))' }}
              >
                <title>{T('statistics.stats.items_count_tooltip', { label: formattedLabel, count }) || `${formattedLabel}: ${count} files`}</title>
              </rect>
            </svg>
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div style={{ position: 'absolute', bottom: '-1.5625rem' }}>
              <Text variant="caption" color="secondary" weight="extrabold">
                {formattedLabel}
              </Text>
            </div>
          </div>
        );
      })}
    </div>
  );
}

BarChart.propTypes = {
  sortedData: PropTypes.arrayOf(PropTypes.array).isRequired,
  maxCount: PropTypes.number.isRequired,
  T: PropTypes.func.isRequired,
  formatDecade: PropTypes.func.isRequired,
};
