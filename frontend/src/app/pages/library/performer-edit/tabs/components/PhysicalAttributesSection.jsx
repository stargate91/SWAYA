import Card from '@/ui/Card';
import Grid from '@/ui/Grid';
import Dropdown from '@/ui/Dropdown';
import Input from '@/ui/Input';

export default function PhysicalAttributesSection({
  form,
  errors,
  handleChange,
  isUnderage,
  hairColorOptions,
  eyeColorOptions,
  ethnicityOptions,
  getDropdownOptions,
  t,
  includeAdult,
}) {
  return (
    <Card
      title={t('library.performerEdit.featuresAppearance') || 'Features & Appearance'}
      variant="flat-glass"
      padding="md"
    >
      <Grid variant="split">
        {!isUnderage && (
          <Input
            label={t('library.performerEdit.heightCm') || 'Height (cm)'}
            type="number"
            placeholder="e.g. 170"
            value={form.height}
            onChange={e => handleChange('height', e.target.value)}
            error={errors.height}
          />
        )}
        {!isUnderage && includeAdult && (
          <Input
            label={t('library.performerEdit.weightKg') || 'Weight (kg)'}
            type="number"
            placeholder="e.g. 60"
            value={form.weight}
            onChange={e => handleChange('weight', e.target.value)}
            error={errors.weight}
          />
        )}
        {!isUnderage && (
          <Dropdown
            label={t('library.details.hairColor') || 'Hair Color'}
            options={getDropdownOptions(hairColorOptions, form.hair_color)}
            value={form.hair_color}
            onChange={e => handleChange('hair_color', e.target.value)}
            placeholder="- Select -"
            searchable
          />
        )}
        {!isUnderage && (
          <Dropdown
            label={t('library.details.eyeColor') || 'Eye Color'}
            options={getDropdownOptions(eyeColorOptions, form.eye_color)}
            value={form.eye_color}
            onChange={e => handleChange('eye_color', e.target.value)}
            placeholder="- Select -"
            searchable
          />
        )}
        <Dropdown
          label={t('library.details.ethnicity') || 'Ethnicity'}
          options={getDropdownOptions(ethnicityOptions, form.ethnicity)}
          value={form.ethnicity}
          onChange={e => handleChange('ethnicity', e.target.value)}
          placeholder="- Select -"
          searchable
        />
      </Grid>
    </Card>
  );
}

