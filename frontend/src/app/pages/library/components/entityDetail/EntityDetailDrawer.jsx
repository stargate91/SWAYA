 
import { toTitleCase, formatListAttr } from '../../utils/heroSectionUtils';
import Drawer from '@/ui/Drawer';
import ParsedParagraphs from '@/ui/ParsedParagraphs';
import DescriptionList from '@/ui/DescriptionList';

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

  const specItems = [
    { label: t('library.details.placeOfBirth'), value: item.place_of_birth, fullWidth: true },
    { label: t('library.details.activeYears'), value: item.career_start_year ? `${item.career_start_year}${DASH_CHAR}${item.career_end_year || t('library.details.present')}` : null },
    { label: t('library.details.height'), value: item.height ? `${item.height}${CM_CHAR}` : null },
    { label: t('library.details.weight'), value: item.weight ? `${item.weight}${KG_CHAR}` : null },
    { label: t('library.details.measurements'), value: item.measurements },
    { label: t('library.details.breastType'), value: item.breast_type ? (t(`library.performerEdit.breastTypes.${item.breast_type.toLowerCase()}`) || toTitleCase(item.breast_type)) : null },
    { label: t('library.details.buttShape') || 'Butt Shape', value: item.butt_shape ? (t(`library.performerEdit.buttShapes.${item.butt_shape.toLowerCase()}`) || toTitleCase(item.butt_shape)) : null },
    { label: t('library.details.buttSize') || 'Butt Size', value: item.butt_size ? (t(`library.performerEdit.buttSizes.${item.butt_size.toLowerCase()}`) || toTitleCase(item.butt_size)) : null },
    { label: t('library.details.hairColor'), value: item.hair_color ? (t(`library.performerEdit.hairColors.${item.hair_color.toLowerCase()}`) || toTitleCase(item.hair_color)) : null },
    { label: t('library.details.eyeColor'), value: item.eye_color ? (t(`library.performerEdit.eyeColors.${item.eye_color.toLowerCase()}`) || toTitleCase(item.eye_color)) : null },
    { label: t('library.details.ethnicity'), value: item.ethnicity ? (t(`library.performerEdit.ethnicities.${item.ethnicity.toLowerCase()}`) || toTitleCase(item.ethnicity)) : null },
    { label: t('library.details.tattoos'), value: tattooVal, fullWidth: true },
    { label: t('library.details.piercings'), value: piercingVal, fullWidth: true },
  ];

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
              <DescriptionList items={specItems} className="ui-description-list ui-description-list--spaced" />
            </div>
          )}

          {/* Section 3: Biography */}
          {overviewText && (
            <div className="entity-detail-page__drawer-section">
              <h4 className="entity-detail-page__drawer-section-title">
                {t('library.details.biographyTitle') || 'Biography'}
              </h4>
              <ParsedParagraphs
                text={overviewText}
                className="entity-detail-page__drawer-bio"
                paragraphClassName="entity-detail-page__drawer-paragraph"
              />
            </div>
          )}
        </div>
    </Drawer>
  );
}
