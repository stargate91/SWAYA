import PropTypes from 'prop-types';
import styles from './Button.module.css';

/**
 * Standard interactive Button component.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Button label or elements
 * @param {'primary' | 'primary-neutral' | 'secondary' | 'secondary-neutral' | 'ghost' | 'danger' | 'onboarding-back' | 'onboarding-continue'} [props.variant] - Button color variant flavor
 * @param {'sm' | 'md' | 'lg'} [props.size] - Button sizing scale
 * @param {React.ReactNode} [props.leftIcon] - Leading icon element
 * @param {React.ReactNode} [props.rightIcon] - Trailing icon element
 * @param {boolean} [props.animateIcon] - Slide icon slightly on hover
 * @param {string} [props.className] - Additional custom class names
 * @param {React.ElementType} [props.as] - HTML element or React component type to render
 */
export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  animateIcon = false,
  as: Component = 'button',
  ...props
}) {
  return (
    <Component
      data-variant={variant}
      data-size={size}
      data-animate-icon={animateIcon}
      className={`${styles.button} ${className}`.trim()}
      {...props}
    >
      {leftIcon && <span data-button-icon="left" className={styles.icon}>{leftIcon}</span>}
      {children && <span className={styles.content}>{children}</span>}
      {rightIcon && <span data-button-icon="right" className={styles.icon}>{rightIcon}</span>}
    </Component>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'primary-neutral', 'secondary', 'secondary-neutral', 'ghost', 'danger', 'onboarding-back', 'onboarding-continue']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
  animateIcon: PropTypes.bool,
  as: PropTypes.elementType,
};
