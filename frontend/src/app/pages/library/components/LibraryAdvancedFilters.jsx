import AttributeFilterDropdown from './AttributeFilterDropdown';
import PanelHeader from '@/ui/PanelHeader';

export default function LibraryAdvancedFilters({
  t,
  breastTypeFilter,
  setBreastTypeFilter,
  breastSizeFilter,
  setBreastSizeFilter,
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
  const normVal = (v) => (v || '').replace(/_/g, ' ').trim().toLowerCase();

  const filterItemsByData = (items, dataValues) => {
    if (!dataValues || dataValues.length === 0) return [];
    const available = new Set(dataValues.map(v => normVal(v)));
    return items.filter(item => available.has(normVal(item.value)));
  };

  const breastSizeItems = filterItemsByData([
    { value: 'SMALL', label: t('library.performerEdit.breastSizes.small') || 'Small' },
    { value: 'MEDIUM', label: t('library.performerEdit.breastSizes.medium') || 'Medium' },
    { value: 'BIG', label: t('library.performerEdit.breastSizes.big') || 'Big' },
    { value: 'EXTRA_BIG', label: t('library.performerEdit.breastSizes.extra_big') || 'Extra Big' },
  ], filterData?.breast_sizes);

  const buttShapeItems = filterItemsByData([
    { value: 'BUBBLE', label: t('library.performerEdit.buttShapes.bubble') || 'Bubble' },
    { value: 'HEART', label: t('library.performerEdit.buttShapes.heart') || 'Heart' },
    { value: 'SQUARE', label: t('library.performerEdit.buttShapes.square') || 'Square' },
    { value: 'FLAT', label: t('library.performerEdit.buttShapes.flat') || 'Flat' },
  ], filterData?.butt_shapes);

  const buttSizeItems = filterItemsByData([
    { value: 'SMALL', label: t('library.performerEdit.buttSizes.small') || 'Small' },
    { value: 'MEDIUM', label: t('library.performerEdit.buttSizes.medium') || 'Medium' },
    { value: 'BIG', label: t('library.performerEdit.buttSizes.big') || 'Big' },
    { value: 'EXTRA_BIG', label: t('library.performerEdit.buttSizes.extra_big') || 'Extra Big' },
  ], filterData?.butt_sizes);

  const tattooItems = filterItemsByData([
    { value: 'yes', label: t('library.filter.yes') || 'Yes' },
    { value: 'no', label: t('library.filter.no') || 'No' },
  ], filterData?.tattoos);

  const piercingItems = filterItemsByData([
    { value: 'yes', label: t('library.filter.yes') || 'Yes' },
    { value: 'no', label: t('library.filter.no') || 'No' },
  ], filterData?.piercings);

  return (
    <PanelHeader.Row className="library-filters-row library-filters-advanced-row">
      <div className="library-filters-left">

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
        {settings?.include_adult && (
          <AttributeFilterDropdown
            label={t('library.filter.breastSizeLabel') || 'Breast Size:'}
            value={breastSizeFilter}
            onChange={setBreastSizeFilter}
            items={breastSizeItems}
            allLabel={t('library.filter.allBreastSizes') || 'All'}
            setCurrentPage={setCurrentPage}
          />
        )}

        {settings?.include_adult && (
          <AttributeFilterDropdown
            label={t('library.filter.buttShapeLabel') || 'Butt Shape:'}
            value={buttShapeFilter}
            onChange={setButtShapeFilter}
            items={buttShapeItems}
            allLabel={t('library.filter.allButtShapes') || 'All'}
            setCurrentPage={setCurrentPage}
          />
        )}

        {settings?.include_adult && (
          <AttributeFilterDropdown
            label={t('library.filter.buttSizeLabel') || 'Butt Size:'}
            value={buttSizeFilter}
            onChange={setButtSizeFilter}
            items={buttSizeItems}
            allLabel={t('library.filter.allButtSizes') || 'All'}
            setCurrentPage={setCurrentPage}
          />
        )}

        <AttributeFilterDropdown
          label={t('library.filter.tattoosLabel') || 'Tattoos:'}
          value={tattoosFilter}
          onChange={setTattoosFilter}
          items={tattooItems}
          allLabel={t('library.filter.allTattoos') || 'All Options'}
          setCurrentPage={setCurrentPage}
        />

        <AttributeFilterDropdown
          label={t('library.filter.piercingsLabel') || 'Piercings:'}
          value={piercingsFilter}
          onChange={setPiercingsFilter}
          items={piercingItems}
          allLabel={t('library.filter.allPiercings') || 'All Options'}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </PanelHeader.Row>
  );
}

