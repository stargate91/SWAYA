import styles from './Stack.module.css';

export default function Stack({
  size,
  gap,
  justify,
  fill = false,
  flex,
  fullWidth,
  fullHeight,
  scrollable = false,
  className = '',
  children,
  ...props
}) {
  const finalSize = gap || size || 'md';
  const classes = [
    styles.root,
    styles[`gap-${finalSize}`],
    justify && styles[`justify-${justify}`],
    fill && styles.fill,
    flex === 1 && styles['flex-1'],
    fullWidth && styles['full-width'],
    fullHeight && styles['full-height'],
    scrollable && styles.scrollable,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}


