import { buildStructurePreviewModel } from '../settingsPreviewModel.js';
import styles from './StructurePreview.module.css';

function PreviewLine({ children, tone = 'default', topSpacing = false, strike = false }) {
  const className = [
    styles['structure-preview-line'],
    tone !== 'default' ? styles[`structure-preview-line--${tone}`] : '',
    topSpacing ? styles['structure-preview-line--top'] : '',
    strike ? styles['structure-preview-line--strike'] : '',
  ].filter(Boolean).join(' ');

  return <div className={className}>{children}</div>;
}

function PreviewBranch({ children, topSpacing = false }) {
  return (
    <div className={`${styles['structure-preview-branch']}${topSpacing ? ` ${styles['structure-preview-branch--top']}` : ''}`}>
      {children}
    </div>
  );
}

function PreviewArrow({ arrow }) {
  return <span className={styles['structure-preview-arrow']}>{arrow}</span>;
}

function renderTreeNode(node, icons) {
  const line = (
    <PreviewLine tone={node.tone} topSpacing={node.topSpacing} strike={node.strike}>
      {node.kind === 'folder' ? icons.folder : icons.file} {node.label}{node.kind === 'folder' ? '/' : ''}
    </PreviewLine>
  );

  if (!node.children?.length) {
    return line;
  }

  return (
    <>
      {line}
      <PreviewBranch>
        {node.children.map((child, index) => (
          <div key={`${node.label}-${child.label}-${index}`}>
            {renderTreeNode(child, icons)}
          </div>
        ))}
      </PreviewBranch>
    </>
  );
}

export default function StructurePreviewPanel({ form, t, filterType }) {
  const model = buildStructurePreviewModel(form, t, filterType);

  return (
    <div className={styles['structure-preview-container']}>
      <div>
        <div className={styles['structure-preview-root']}>
          {model.rootIcon} {model.rootLabel}
        </div>
        <div className={styles['structure-preview-indent']}>
          {model.mode === 'tree' ? (
            model.nodes.map((node, index) => (
              <div key={`${node.label}-${index}`}>
                {renderTreeNode(node, {
                  folder: model.folderIcon,
                  file: model.fileIcon,
                })}
              </div>
            ))
          ) : (
            <div className={styles['structure-preview-rename-list']}>
              {model.items.map((item, index) => (
                <div key={`${item.before}-${index}`} className={index === 0 ? '' : styles['structure-preview-rename-item']}>
                  <span className={`${styles['structure-preview-line']} ${styles['structure-preview-line--muted']} ${item.noStrikeBefore ? '' : styles['structure-preview-line--strike']}`}>
                    {model.fileIcon} {item.before}
                  </span>
                  <PreviewArrow arrow={model.arrow} />
                  <span className={`${styles['structure-preview-line']} ${styles[`structure-preview-line--${item.afterTone}`]}${item.strike ? ` ${styles['structure-preview-line--strike']}` : ''}`}>
                    {model.fileIcon} {item.after}
                  </span>
                  {item.registered && (
                    <span className={styles['structure-preview-registered-badge']}>
                      {t('settingsPage.sections.organization.previewRegisteredBadge', { defaultValue: 'In Library' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
