 
import { toTitleCase, formatListAttr } from '../../utils/heroSectionUtils';
import Drawer from '@/ui/Drawer';

const TIMES_CHAR = '\u00d7';
const DASH_CHAR = ' - ';
const CM_CHAR = ' cm';
const KG_CHAR = ' kg';

export default function EntityDetailDrawer({
  isDrawerOpen,
  setIsDrawerOpen,
  item,
  overviewTitle,
  drawerAliases,
  overviewText,
  t
}) {
  const tattooVal = formatListAttr(item.tattoos);
  const piercingVal = formatListAttr(item.piercings);
  const hasAnySpecs = item?.height || item?.weight || item?.measurements || item?.breast_type || item?.hair_color || item?.eye_color || item?.ethnicity || item?.tattoos || item?.piercings || item?.career_start_year || item?.place_of_birth || item?.butt_shape || item?.butt_size;

  return (
    <Drawer
      isOpen={isDrawerOpen}
      onClose={() => setIsDrawerOpen(false)}
      title={item?.name || overviewTitle}
      size="md"
    >
      <div className="entity-detail-page__drawer-content">
          {/* Section 1: Alternate Names */}
          {drawerAliases.length > 0 && (
            <div className="entity-detail-page__drawer-section">
              <h4 className="entity-detail-page__drawer-section-title">
                {t('library.details.alsoKnownAs') || 'Also known as'}
              </h4>
              <div className="entity-detail-page__drawer-aliases-text">
                {drawerAliases.join(', ')}
              </div>
            </div>
          )}

          {/* Section 2: Physical Specs */}
          {hasAnySpecs && (
            <div className="entity-detail-page__drawer-section">
              <h4 className="entity-detail-page__drawer-section-title">
                {t('library.details.specsTitle') || 'Physical Specs'}
              </h4>
              <div className="entity-detail-page__drawer-specs-grid">
                {item.place_of_birth && (
                  <div className="entity-detail-page__specs-item entity-detail-page__specs-item--full">
                    <span className="entity-detail-page__specs-label">{t('library.details.placeOfBirth')}</span>
                    <span className="entity-detail-page__specs-value">{item.place_of_birth}</span>
                  </div>
                )}
                {item.career_start_year && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.activeYears')}</span>
                    <span className="entity-detail-page__specs-value">
                      {item.career_start_year}{DASH_CHAR}{item.career_end_year || t('library.details.present')}
                    </span>
                  </div>
                )}
                {item.height && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.height')}</span>
                    <span className="entity-detail-page__specs-value">{item.height}{CM_CHAR}</span>
                  </div>
                )}
                {item.weight && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.weight')}</span>
                    <span className="entity-detail-page__specs-value">{item.weight}{KG_CHAR}</span>
                  </div>
                )}
                {item.measurements && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.measurements')}</span>
                    <span className="entity-detail-page__specs-value">{item.measurements}</span>
                  </div>
                )}
                {item.breast_type && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.breastType')}</span>
                    <span className="entity-detail-page__specs-value">{t(`library.performerEdit.breastTypes.${item.breast_type.toLowerCase()}`) || toTitleCase(item.breast_type)}</span>
                  </div>
                )}
                {item.butt_shape && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.buttShape') || 'Butt Shape'}</span>
                    <span className="entity-detail-page__specs-value">{t(`library.performerEdit.buttShapes.${item.butt_shape.toLowerCase()}`) || toTitleCase(item.butt_shape)}</span>
                  </div>
                )}
                {item.butt_size && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.buttSize') || 'Butt Size'}</span>
                    <span className="entity-detail-page__specs-value">{t(`library.performerEdit.buttSizes.${item.butt_size.toLowerCase()}`) || toTitleCase(item.butt_size)}</span>
                  </div>
                )}
                {item.hair_color && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.hairColor')}</span>
                    <span className="entity-detail-page__specs-value">{t(`library.performerEdit.hairColors.${item.hair_color.toLowerCase()}`) || toTitleCase(item.hair_color)}</span>
                  </div>
                )}
                {item.eye_color && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.eyeColor')}</span>
                    <span className="entity-detail-page__specs-value">{t(`library.performerEdit.eyeColors.${item.eye_color.toLowerCase()}`) || toTitleCase(item.eye_color)}</span>
                  </div>
                )}
                {item.ethnicity && (
                  <div className="entity-detail-page__specs-item">
                    <span className="entity-detail-page__specs-label">{t('library.details.ethnicity')}</span>
                    <span className="entity-detail-page__specs-value">{t(`library.performerEdit.ethnicities.${item.ethnicity.toLowerCase()}`) || toTitleCase(item.ethnicity)}</span>
                  </div>
                )}
                {tattooVal && (
                  <div className="entity-detail-page__specs-item entity-detail-page__specs-item--full">
                    <span className="entity-detail-page__specs-label">{t('library.details.tattoos')}</span>
                    <span className="entity-detail-page__specs-value">{tattooVal}</span>
                  </div>
                )}
                {piercingVal && (
                  <div className="entity-detail-page__specs-item entity-detail-page__specs-item--full">
                    <span className="entity-detail-page__specs-label">{t('library.details.piercings')}</span>
                    <span className="entity-detail-page__specs-value">{piercingVal}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Biography */}
          {overviewText && (
            <div className="entity-detail-page__drawer-section">
              <h4 className="entity-detail-page__drawer-section-title">
                {t('library.details.biographyTitle') || 'Biography'}
              </h4>
              <div className="entity-detail-page__drawer-bio">
                {overviewText.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index} className="entity-detail-page__drawer-paragraph">{paragraph}</p>
                ))}
              </div>
            </div>
          )}
        </div>
    </Drawer>
  );
}
