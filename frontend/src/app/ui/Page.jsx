import PageHeader from './PageHeader';
import './Page.css';

export default function Page({
  eyebrow,
  title,
  description,
  actions,
  centered = false,
  viewport = false,
  contentBottom = false,
  className = '',
  children,
}) {
  return (
    <div
      className={`ui-page${centered ? ' ui-page--centered' : ''}${contentBottom ? ' ui-page--content-bottom' : ''}${viewport ? ' ui-page--viewport' : ''} ${className}`.trim()}
    >
      {(title || description || eyebrow || actions) ? (
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={actions}
        />
      ) : null}
      {children}
    </div>
  );
}
