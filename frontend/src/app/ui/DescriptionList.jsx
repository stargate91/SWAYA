/**
 * A Description List component to render key-value grids or lists cleanly.
 *
 * @param {Object} props
 * @param {Array<Object>} props.items - The list of objects containing { label, value, fullWidth, className }.
 * @param {string} [props.className='ui-description-list'] - Wrapper container class name.
 * @param {string} [props.itemClassName='ui-description-list__item'] - Individual key-value container class name.
 * @param {string} [props.labelClassName='ui-description-list__label'] - Label element class name.
 * @param {string} [props.valueClassName='ui-description-list__value'] - Value element class name.
 * @param {string} [props.fullWidthClassName='ui-description-list__item--full'] - Class name appended when item is full-width.
 * @returns {React.ReactElement|null}
 */
export default function DescriptionList({
  items,
  className = 'ui-description-list',
  itemClassName = 'ui-description-list__item',
  labelClassName = 'ui-description-list__label',
  valueClassName = 'ui-description-list__value',
  fullWidthClassName = 'ui-description-list__item--full',
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const activeItems = items.filter((item) => item && item.value !== undefined && item.value !== null && item.value !== '');
  if (activeItems.length === 0) return null;

  return (
    <div className={className}>
      {activeItems.map((item, idx) => {
        const classes = [
          itemClassName,
          item.fullWidth && fullWidthClassName,
          item.className,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={idx} className={classes}>
            <span className={labelClassName}>{item.label}</span>
            <span className={valueClassName}>{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
export { DescriptionList };
