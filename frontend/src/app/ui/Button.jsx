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
  icon,
  leftIcon,
  rightIcon,
  animateIcon = false,
  destructiveHover = false,
  radius,
  as: Component = 'button',
  fullWidth,
  ...props
}) {
  const renderIcon = (iconVal) => {
    if (!iconVal) return null;
    // Check if it is a component constructor (function or forwardRef object)
    if (
      typeof iconVal === 'function' ||
      (typeof iconVal === 'object' && iconVal.$$typeof && iconVal.$$typeof.toString().includes('react.forward_ref'))
    ) {
      const IconComponent = iconVal;
      return <IconComponent size={size === 'sm' ? 14 : 16} />;
    }
    return iconVal;
  };

  const actualLeftIcon = leftIcon || icon;
  return (
    <Component
      data-variant={variant}
      data-size={size}
      data-animate-icon={animateIcon}
      data-destructive-hover={destructiveHover}
      data-radius={radius}
      data-full-width={fullWidth || undefined}
      className={`${styles.button} ${className}`.trim()}
      {...props}
    >
      {actualLeftIcon && <span data-button-icon="left" className={styles.icon}>{renderIcon(actualLeftIcon)}</span>}
      {children && <span className={styles.content}>{children}</span>}
      {rightIcon && <span data-button-icon="right" className={styles.icon}>{renderIcon(rightIcon)}</span>}
    </Component>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'secondary', 'secondary-neutral', 'ghost', 'danger', 'success', 'onboarding-back', 'onboarding-continue', 'tag', 'glass']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  icon: PropTypes.node,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
  animateIcon: PropTypes.bool,
  destructiveHover: PropTypes.bool,
  radius: PropTypes.oneOf(['none', 'xs', 'sm', 'md', 'lg', 'xl', 'full']),
  as: PropTypes.elementType,
  fullWidth: PropTypes.bool,
};
