/* eslint-disable react/forbid-component-props */
import styles from './Pill.module.css';

export default function Pill({ children, variant = 'default', className = '', as: Component = 'span', customStyle, style, icon, ...props }) {
  const DefaultComponent = props.onClick ? 'button' : Component;
  return (
    <DefaultComponent
      type={DefaultComponent === 'button' ? 'button' : undefined}
      className={`${styles.pill} ${styles[variant] || ''} ${className}`.trim()}
      style={customStyle || style}
      {...props}
    >
      {icon}
      {icon && children !== undefined ? <span>{children}</span> : children}
    </DefaultComponent>
  );
}
