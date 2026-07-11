import AttributeFilterDropdown from './AttributeFilterDropdown';

export default function LibraryAdvancedFilters({
  t,
  hairColorFilter,
  setHairColorFilter,
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
  settings
}) {
  return (
    <div className="organizer-panel__row library-filters-row library-filters-advanced-row">
      <div className="library-filters-left">
        <AttributeFilterDropdown
          label={t('library.filter.hairColorLabel') || 'Hair Color:'}
          value={hairColorFilter}
          onChange={setHairColorFilter}
          items={filterData?.hair_colors}
          allLabel={t('library.filter.allHairColors') || 'All Hair Colors'}
          setCurrentPage={setCurrentPage}
        />

        <AttributeFilterDropdown
          label={t('library.filter.eyeColorLabel') || 'Eye Color:'}
          value={eyeColorFilter}
          onChange={setEyeColorFilter}
          items={filterData?.eye_colors}
          allLabel={t('library.filter.allEyeColors') || 'All Eye Colors'}
          setCurrentPage={setCurrentPage}
        />

        {settings?.include_adult && (
          <AttributeFilterDropdown
            label={t('library.filter.breastTypeLabel') || 'Breast Type:'}
            value={breastTypeFilter}
            onChange={setBreastTypeFilter}
            items={filterData?.breast_types}
            allLabel={t('library.filter.allBreastTypes') || 'All'}
            setCurrentPage={setCurrentPage}
          />
        )}

        {settings?.include_adult && filterData?.butt_shapes && filterData.butt_shapes.length > 0 && (
          <AttributeFilterDropdown
            label={t('library.filter.buttShapeLabel') || 'Butt Shape:'}
            value={buttShapeFilter}
            onChange={setButtShapeFilter}
            items={[
              { value: 'BUBBLE', label: t('library.performerEdit.buttShapes.bubble') || 'Bubble' },
              { value: 'HEART', label: t('library.performerEdit.buttShapes.heart') || 'Heart' },
              { value: 'SQUARE', label: t('library.performerEdit.buttShapes.square') || 'Square' },
              { value: 'FLAT', label: t('library.performerEdit.buttShapes.flat') || 'Flat' },
            ]}
            allLabel={t('library.filter.allButtShapes') || 'All'}
            setCurrentPage={setCurrentPage}
          />
        )}

        {settings?.include_adult && filterData?.butt_sizes && filterData.butt_sizes.length > 0 && (
          <AttributeFilterDropdown
            label={t('library.filter.buttSizeLabel') || 'Butt Size:'}
            value={buttSizeFilter}
            onChange={setButtSizeFilter}
            items={[
              { value: 'SMALL', label: t('library.performerEdit.buttSizes.small') || 'Small' },
              { value: 'MEDIUM', label: t('library.performerEdit.buttSizes.medium') || 'Medium' },
              { value: 'BIG', label: t('library.performerEdit.buttSizes.big') || 'Big' },
              { value: 'EXTRA_BIG', label: t('library.performerEdit.buttSizes.extra_big') || 'Extra Big' },
            ]}
            allLabel={t('library.filter.allButtSizes') || 'All'}
            setCurrentPage={setCurrentPage}
          />
        )}

        {filterData?.tattoos && filterData.tattoos.length > 0 && (
          <AttributeFilterDropdown
            label={t('library.filter.tattoosLabel') || 'Tattoos:'}
            value={tattoosFilter}
            onChange={setTattoosFilter}
            items={[
              { value: 'yes', label: t('library.filter.yes') || 'Yes' },
              { value: 'no', label: t('library.filter.no') || 'No' },
            ]}
            allLabel={t('library.filter.allTattoos') || 'All Options'}
            setCurrentPage={setCurrentPage}
          />
        )}

        {filterData?.piercings && filterData.piercings.length > 0 && (
          <AttributeFilterDropdown
            label={t('library.filter.piercingsLabel') || 'Piercings:'}
            value={piercingsFilter}
            onChange={setPiercingsFilter}
            items={[
              { value: 'yes', label: t('library.filter.yes') || 'Yes' },
              { value: 'no', label: t('library.filter.no') || 'No' },
            ]}
            allLabel={t('library.filter.allPiercings') || 'All Options'}
            setCurrentPage={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
