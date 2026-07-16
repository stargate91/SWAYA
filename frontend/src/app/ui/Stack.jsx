import styles from './Stack.module.css';

export default function Stack({ size, gap, justify, fill = false, className = '', children, ...props }) {
  const finalSize = gap || size || 'md';
  const classes = [
    styles.root,
    styles[`gap-${finalSize}`],
    justify && styles[`justify-${justify}`],
    fill && styles.fill,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

