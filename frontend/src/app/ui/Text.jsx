import PropTypes from 'prop-types';
import styles from './Text.module.css';

/**
 * Standard typography component.
 *
 * @param {object} props
 * @param {React.ElementType} [props.as] - HTML tag to render
 * @param {'body' | 'caption' | 'title' | 'display' | 'small' | 'xsmall' | 'hero'} [props.variant] - Text styling flavor
 * @param {'primary' | 'secondary' | 'muted' | 'faint' | 'accent'} [props.color] - Text color
 * @param {'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'} [props.weight] - Font weight override
 * @param {boolean} [props.uppercase] - Whether to transform text to uppercase
 * @param {string} [props.className] - Additional custom class names
 * @param {React.ReactNode} props.children
 */
export default function Text({
  as: Component = 'span',
  variant = 'body',
  color = 'primary',
  weight,
  uppercase = false,
  truncate = false,
  clamp,
  italic = false,
  shadow,
  style,
  className = '',
  children,
  ...props
}) {
  const classes = [
    styles.root,
    styles[`variant-${variant}`],
    styles[`color-${color}`],
    weight && styles[`weight-${weight}`],
    uppercase && styles.uppercase,
    truncate && styles.truncate,
    clamp && styles.clamp,
    italic && styles.italic,
    shadow && styles[`shadow-${shadow}`],
    className
  ].filter(Boolean).join(' ');

  const mergedStyle = clamp
    ? { ...style, '--text-clamp': clamp }
    : style;

  return (
    <Component {...props} {...{ className: classes, style: mergedStyle }}>
      {children}
    </Component>
  );
}

Text.propTypes = {
  as: PropTypes.elementType,
  variant: PropTypes.oneOf(['body', 'caption', 'title', 'display', 'small', 'xsmall', 'hero']),
  color: PropTypes.oneOf(['primary', 'secondary', 'muted', 'faint', 'accent']),
  weight: PropTypes.oneOf(['normal', 'medium', 'semibold', 'bold', 'extrabold']),
  uppercase: PropTypes.bool,
  truncate: PropTypes.bool,
  clamp: PropTypes.number,
  italic: PropTypes.bool,
  shadow: PropTypes.oneOf(['title', 'tagline']),
  className: PropTypes.string,
  children: PropTypes.node,
};
