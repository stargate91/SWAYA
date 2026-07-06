import Dropdown from '@/ui/Dropdown';

const formatPhysicalAttributeLabel = (val) => {
  if (!val) return '';
  if (val.toUpperCase() === 'NA' || val.toUpperCase() === 'N/A') return 'N/A';
  return val
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word === 'na' || word === 'n/a') return 'N/A';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export default function LibraryAdvancedFilters({
  t,
  hairColorFilter,
  setHairColorFilter,
  ethnicityFilter,
  setEthnicityFilter,
  eyeColorFilter,
  setEyeColorFilter,
  breastTypeFilter,
  setBreastTypeFilter,
  buttShapeFilter,
  setButtShapeFilter,
  buttSizeFilter,
  setButtSizeFilter,
  tattoosFilter,
  setTattoosFilter,
  piercingsFilter,
  setPiercingsFilter,
  filterData,
  setCurrentPage,
  activeSessionMode
}) {
  return (
    <div className="organizer-panel__row library-filters-row library-filters-advanced-row">
      <div className="library-filters-left">
        {filterData?.hair_colors && filterData.hair_colors.length > 0 && (
          <div className="library-sorter-container">
            <span className="library-sorter-label">{t('library.filter.hairColorLabel') || 'Hair Color:'}</span>
            <Dropdown
              variant="sorter"
              value={hairColorFilter}
              onChange={(e) => {
                setHairColorFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: t('library.filter.allHairColors') || 'All Hair Colors' },
                ...(filterData.hair_colors).map(hc => ({ value: hc, label: formatPhysicalAttributeLabel(hc) })),
              ]}
            />
          </div>
        )}


        {filterData?.eye_colors && filterData.eye_colors.length > 0 && (
          <div className="library-sorter-container">
            <span className="library-sorter-label">{t('library.filter.eyeColorLabel') || 'Eye Color:'}</span>
            <Dropdown
              variant="sorter"
              value={eyeColorFilter}
              onChange={(e) => {
                setEyeColorFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: t('library.filter.allEyeColors') || 'All Eye Colors' },
                ...(filterData.eye_colors).map(ec => ({ value: ec, label: formatPhysicalAttributeLabel(ec) })),
              ]}
            />
          </div>
        )}

        {filterData?.breast_types && filterData.breast_types.length > 0 && (
          <div className="library-sorter-container">
            <span className="library-sorter-label">{t('library.filter.breastTypeLabel') || 'Breast Type:'}</span>
            <Dropdown
              variant="sorter"
              value={breastTypeFilter}
              onChange={(e) => {
                setBreastTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: t('library.filter.allBreastTypes') || 'All' },
                ...(filterData.breast_types).map(bt => ({ value: bt, label: formatPhysicalAttributeLabel(bt) })),
              ]}
            />
          </div>
        )}

        {activeSessionMode === 'nsfw' && (
          <>
            <div className="library-sorter-container">
              <span className="library-sorter-label">{t('library.filter.buttShapeLabel') || 'Butt Shape:'}</span>
              <Dropdown
                variant="sorter"
                value={buttShapeFilter}
                onChange={(e) => {
                  setButtShapeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: t('library.filter.allButtShapes') || 'All' },
                  { value: 'BUBBLE', label: t('library.performerEdit.buttShapes.bubble') || 'Bubble' },
                  { value: 'HEART', label: t('library.performerEdit.buttShapes.heart') || 'Heart' },
                  { value: 'SQUARE', label: t('library.performerEdit.buttShapes.square') || 'Square' },
                  { value: 'FLAT', label: t('library.performerEdit.buttShapes.flat') || 'Flat' },
                ]}
              />
            </div>

            <div className="library-sorter-container">
              <span className="library-sorter-label">{t('library.filter.buttSizeLabel') || 'Butt Size:'}</span>
              <Dropdown
                variant="sorter"
                value={buttSizeFilter}
                onChange={(e) => {
                  setButtSizeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: t('library.filter.allButtSizes') || 'All' },
                  { value: 'SMALL', label: t('library.performerEdit.buttSizes.small') || 'Small' },
                  { value: 'MEDIUM', label: t('library.performerEdit.buttSizes.medium') || 'Medium' },
                  { value: 'BIG', label: t('library.performerEdit.buttSizes.big') || 'Big' },
                  { value: 'EXTRA_BIG', label: t('library.performerEdit.buttSizes.extra_big') || 'Extra Big' },
                ]}
              />
            </div>
          </>
        )}

        <div className="library-sorter-container">
          <span className="library-sorter-label">{t('library.filter.tattoosLabel') || 'Tattoos:'}</span>
          <Dropdown
            variant="sorter"
            value={tattoosFilter}
            onChange={(e) => {
              setTattoosFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: t('library.filter.allTattoos') || 'All Options' },
              { value: 'yes', label: t('library.filter.yes') || 'Yes' },
              { value: 'no', label: t('library.filter.no') || 'No' },
            ]}
          />
        </div>

        <div className="library-sorter-container">
          <span className="library-sorter-label">{t('library.filter.piercingsLabel') || 'Piercings:'}</span>
          <Dropdown
            variant="sorter"
            value={piercingsFilter}
            onChange={(e) => {
              setPiercingsFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: t('library.filter.allPiercings') || 'All Options' },
              { value: 'yes', label: t('library.filter.yes') || 'Yes' },
              { value: 'no', label: t('library.filter.no') || 'No' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
