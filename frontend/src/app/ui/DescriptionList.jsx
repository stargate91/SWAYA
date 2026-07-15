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
import styles from './DescriptionList.module.css';

export default function DescriptionList({
  items,
  spaced = false,
  className = '',
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const activeItems = items.filter((item) => item && item.value !== undefined && item.value !== null && item.value !== '');
  if (activeItems.length === 0) return null;

  const containerClassName = `
    ${styles.list}
    ${spaced ? styles['list--spaced'] : ''}
    ${className}
  `.trim();

  return (
    <div className={containerClassName}>
      {activeItems.map((item, idx) => {
        const itemClassName = `
          ${styles.item}
          ${item.fullWidth ? styles['item--full'] : ''}
          ${item.className || ''}
        `.trim();

        return (
          <div key={idx} className={itemClassName}>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.value}>{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
export { DescriptionList };
