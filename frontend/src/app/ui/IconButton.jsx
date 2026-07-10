import './Button.css';

export default function IconButton({
  children,
  className = '',
  variant = 'secondary-neutral',
  size = 'md',
  label,
  title,
  wrapped = false,
  wrapperHoverOnly = false,
  ...props
}) {
  const accessibleLabel = label || title;

  const button = (
    <button
      className={`ui-icon-button ui-icon-button--${variant} ui-icon-button--${size} ${className}`.trim()}
      aria-label={accessibleLabel}
      title={title === null ? undefined : (title || accessibleLabel)}
      {...props}
    >
      {children}
    </button>
  );

  if (wrapped) {
    const wrapperClass = `ui-icon-button-wrapper ${wrapperHoverOnly ? 'ui-icon-button-wrapper--hover-only' : ''}`.trim();
    return (
      <div className={wrapperClass}>
        {button}
      </div>
    );
  }

  return button;
}
