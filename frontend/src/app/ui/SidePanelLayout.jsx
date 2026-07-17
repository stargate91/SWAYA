import PropTypes from 'prop-types';
import styles from './SidePanelLayout.module.css';

/**
 * Reusable side-panel layout with sliding entrance animations.
 *
 * @param {object} props
 * @param {'left' | 'right'} [props.side] - Side where the panel resides
 * @param {string} [props.panelWidth] - Custom width of the panel (e.g. '20rem')
 * @param {React.ReactNode} props.panelContent - Content inside the side panel
 * @param {boolean} [props.showPanel] - Whether the panel is currently visible
 * @param {string} [props.panelClassName] - Additional class name for the panel container
 * @param {React.ReactNode} props.children - Main form/content
 */
export default function SidePanelLayout({
  side = 'right',
  panelWidth,
  panelContent,
  showPanel = true,
  panelClassName = '',
  children,
}) {
  const isRight = side === 'right';

  const layoutClasses = [
    styles.root,
    isRight ? styles['root--right'] : styles['root--left'],
  ].join(' ');

  const panelClasses = [
    styles.panel,
    isRight ? styles['panel--right'] : styles['panel--left'],
    panelClassName,
  ].join(' ');

  const setPanelWidthRef = el => {
    if (el && panelWidth) {
      el.style.setProperty('--side-panel-width', panelWidth);
    }
  };

  return (
    <div className={layoutClasses}>
      {!isRight && showPanel && (
        <div className={panelClasses} ref={setPanelWidthRef}>
          {panelContent}
        </div>
      )}
      <div className={styles.main}>
        {children}
      </div>
      {isRight && showPanel && (
        <div className={panelClasses} ref={setPanelWidthRef}>
          {panelContent}
        </div>
      )}
    </div>
  );
}

SidePanelLayout.propTypes = {
  side: PropTypes.oneOf(['left', 'right']),
  panelWidth: PropTypes.string,
  panelContent: PropTypes.node,
  showPanel: PropTypes.bool,
  panelClassName: PropTypes.string,
  children: PropTypes.node,
};
