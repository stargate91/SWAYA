import './Stack.css';

export default function Stack({ size, gap, className = '', children, ...props }) {
  const finalSize = gap || size || 'md';
  return (
    <div className={`ui-stack ui-stack--${finalSize} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
