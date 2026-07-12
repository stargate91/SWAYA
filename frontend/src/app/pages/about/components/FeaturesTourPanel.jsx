import Switch from '../../../ui/Switch';
import { CAMERA_EMOJI, NSFW_TEXT } from '../utils/aboutHelpers';
import { getFeaturesTourData } from '../utils/aboutData';

export default function FeaturesTourPanel({
  activeTourIndex,
  setActiveTourIndex,
  activeSubFeatureIndex,
  setActiveSubFeatureIndex,
  showNsfwDocs,
  setShowNsfwDocs,
  setActiveLightboxUrl,
  t
}) {
  const featuresTourData = getFeaturesTourData(t);

  const activeItem = featuresTourData[activeTourIndex];
  if (!activeItem) return null;

  const hasSubFeature = activeSubFeatureIndex !== null && activeItem.details && activeItem.details[activeSubFeatureIndex];
  const currentItemObj = hasSubFeature ? activeItem.details[activeSubFeatureIndex] : activeItem;

  const displayTitle = currentItemObj.title;
  const displayDescription = currentItemObj.description;
  const displayImage = showNsfwDocs && currentItemObj.image_nsfw ? currentItemObj.image_nsfw : currentItemObj.image;

  return (
    <div className="about-tab-panel features-panel about-features-tour-container">
      <div className="about-features-tour-body">
        {/* Left Sub-sidebar (Navigation of features) */}
        <div className="about-features-tour-sidebar">
          <div className="about-features-nsfw-toggle">
            <span className="about-features-nsfw-label">{t('about.docs_wizard.show_nsfw_features') || 'Show NSFW features'}</span>
            <Switch
              checked={showNsfwDocs}
              onChange={() => {
                setShowNsfwDocs(!showNsfwDocs);
                if (showNsfwDocs && hasSubFeature && activeItem.details[activeSubFeatureIndex].nsfw) {
                  setActiveSubFeatureIndex(null);
                }
              }}
            />
          </div>

          {featuresTourData.map((f, idx) => {
            const isMainActive = activeTourIndex === idx && activeSubFeatureIndex === null;
            const isAnyActive = activeTourIndex === idx;
            const filteredDetails = f.details ? f.details.filter(detail => showNsfwDocs || !detail.nsfw) : [];
            const activeSubIndex = f.details ? filteredDetails.findIndex(detail => f.details.indexOf(detail) === activeSubFeatureIndex) : -1;

            return (
              <div key={f.id} className="about-features-sidebar-group">
                  <div
                    className={`ui-sidebar-item ${isMainActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTourIndex(idx);
                      setActiveSubFeatureIndex(null);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveTourIndex(idx);
                        setActiveSubFeatureIndex(null);
                      }
                    }}
                  >
                    <span className="ui-sidebar-item-icon about-features-item-icon">{f.icon}</span>
                    <span className="ui-sidebar-label about-features-item-label">{f.title}</span>
                    {f.details && (
                      <span className="about-features-item-expand">
                        {isAnyActive ? '▼' : '▶'}
                      </span>
                    )}
                  </div>

                  {f.details && isAnyActive && filteredDetails.length > 0 && (
                    <div className="ui-sidebar-sub-menu is-open about-features-sub-menu">
                      {activeSubIndex !== -1 && (
                        <div
                          className="ui-sidebar-sub-indicator about-features-sub-indicator"
                          // eslint-disable-next-line react/forbid-dom-props
                          style={{ top: `${activeSubIndex * 32}px` }}
                        />
                      )}
                      {filteredDetails.map((detail) => {
                        const originalIndex = f.details.indexOf(detail);
                        const isSubActive = activeTourIndex === idx && activeSubFeatureIndex === originalIndex;
                        return (
                          <div
                            key={originalIndex}
                            className={`ui-sidebar-sub-item ${isSubActive ? 'active' : ''}`}
                            onClick={() => {
                              setActiveTourIndex(idx);
                              setActiveSubFeatureIndex(originalIndex);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActiveTourIndex(idx);
                                setActiveSubFeatureIndex(originalIndex);
                              }
                            }}
                          >
                            <span className="about-features-sub-item-text">{detail.title}</span>
                            {detail.nsfw && (
                              <span className="about-features-nsfw-badge">
                                {NSFW_TEXT}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
            );
          })}
        </div>

        {/* Right Content Panel (Split details + image) */}
        <div className="about-features-content-panel">
          <h3 className="about-features-content-title">
            {displayTitle}
          </h3>

          {/* Screenshot / Image Showcase */}
          <div
            className={`about-features-screenshot-wrapper ${displayImage ? '' : 'about-features-screenshot-wrapper--placeholder'}`}
            onClick={() => {
              if (displayImage) {
                setActiveLightboxUrl(displayImage);
              }
            }}
            role="button"
            tabIndex={displayImage ? 0 : -1}
            onKeyDown={displayImage ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveLightboxUrl(displayImage);
              }
            } : undefined}
          >
            {displayImage ? (
              <img
                src={displayImage}
                alt={displayTitle}
                className="about-features-screenshot-image"
              />
            ) : (
              <div className="about-features-placeholder-content">
                <span className="about-features-placeholder-icon">{CAMERA_EMOJI}</span>
                <span className="about-features-placeholder-label">{t('about.docs_wizard.screenshot_placeholder') || 'Screenshot Placeholder'}</span>
                <span className="about-features-placeholder-title">{displayTitle}</span>
              </div>
            )}
          </div>

          {/* Features / Details of the selected page */}
          <div className="about-features-description-container">
            <p className="about-features-description-text">
              {displayDescription}
            </p>
            {showNsfwDocs && currentItemObj.description_nsfw && (
              <div className="about-features-nsfw-description">
                {/* Extract only the nsfw specific extension part if description_nsfw starts with base description */}
                {currentItemObj.description_nsfw.replace(currentItemObj.description, '').trim().replace(/^\n+/, '')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
