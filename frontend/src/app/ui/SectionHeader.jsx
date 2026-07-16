import PropTypes from 'prop-types';
import Text from './Text';
import styles from './SectionHeader.module.css';

/**
 * Standardized section header typography divider.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title - The text or element to display as header title
 * @param {string} [props.className] - Additional class names
 */
export default function SectionHeader({ title, className = '', ...props }) {
  return (
    <Text
      variant="caption"
      color="secondary"
      weight="extrabold"
      uppercase
      className={`${styles.header} ${className}`.trim()}
      as="h2"
      {...props}
    >
      {title}
    </Text>
  );
}

SectionHeader.propTypes = {
  title: PropTypes.node.isRequired,
  className: PropTypes.string,
};
