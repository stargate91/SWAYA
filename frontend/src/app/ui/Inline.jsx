import './Inline.css';

export default function Inline({ gap, align, className = '', children, ...props }) {
  const classes = [
    'ui-inline',
    gap && `ui-inline--gap-${gap}`,
    align && `ui-inline--align-${align}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
