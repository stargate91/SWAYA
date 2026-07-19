import Card from '@/ui/Card';
import Grid from '@/ui/Grid';
import Dropdown from '@/ui/Dropdown';
import Input from '@/ui/Input';

export default function MeasurementsSection({
  form,
  errors,
  handleChange,
  computedMeasurements,
  breastTypeOptions,
  cupSizeOptions,
  buttShapeOptions,
  buttSizeOptions,
  getDropdownOptions,
  t,
}) {
  return (
    <Card
      title={t('library.performerEdit.bodyMeasurements') || 'Body & Measurements'}
      variant="flat-glass"
      padding="md"
    >
      <Grid variant="split">
        <Input
          label={t('library.performerEdit.measurementsPreview') || 'Measurements (Preview)'}
          type="text"
          placeholder="e.g. 34B-24-34"
          value={computedMeasurements}
          disabled
        />
        <Dropdown
          label={t('library.details.breastType') || 'Breast Type'}
          options={breastTypeOptions}
          value={form.breast_type}
          onChange={e => handleChange('breast_type', e.target.value)}
          placeholder="- Select -"
        />
        <Dropdown
          label={t('library.performerEdit.cupSize') || 'Cup Size'}
          options={getDropdownOptions(cupSizeOptions, form.cup_size)}
          value={form.cup_size}
          onChange={e => handleChange('cup_size', e.target.value)}
          placeholder="- Select -"
          error={errors.cup_size}
          searchable
        />
        <Input
          label={t('library.performerEdit.bandSize') || 'Band Size'}
          type="number"
          placeholder="e.g. 34"
          value={form.band_size}
          onChange={e => handleChange('band_size', e.target.value.replace(/\D/g, ''))}
          min={10}
          max={100}
          step={1}
          error={errors.band_size}
        />
        <Input
          label={t('library.performerEdit.waistInches') || 'Waist (inches)'}
          type="number"
          placeholder="e.g. 24"
          value={form.waist}
          onChange={e => handleChange('waist', e.target.value.replace(/\D/g, ''))}
          min={10}
          max={100}
          step={1}
          error={errors.waist}
        />
        <Input
          label={t('library.performerEdit.hipInches') || 'Hip (inches)'}
          type="number"
          placeholder="e.g. 34"
          value={form.hip}
          onChange={e => handleChange('hip', e.target.value.replace(/\D/g, ''))}
          min={10}
          max={100}
          step={1}
          error={errors.hip}
        />
        <Dropdown
          label={t('library.performerEdit.buttShape') || 'Butt Shape'}
          options={buttShapeOptions}
          value={form.butt_shape}
          onChange={e => handleChange('butt_shape', e.target.value)}
          placeholder="- Select -"
        />
        <Dropdown
          label={t('library.performerEdit.buttSize') || 'Butt Size'}
          options={buttSizeOptions}
          value={form.butt_size}
          onChange={e => handleChange('butt_size', e.target.value)}
          placeholder="- Select -"
        />
      </Grid>
    </Card>
  );
}

