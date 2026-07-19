import Card from '@/ui/Card';
import Text from '@/ui/Text';
import Inline from '@/ui/Inline';
import Grid from '@/ui/Grid';
import Stack from '@/ui/Stack';
import Dropdown from '@/ui/Dropdown';
import Input from '@/ui/Input';
import Field from '@/ui/Field';
import fieldStyles from '@/ui/Field.module.css';
import { TARGET_LANGUAGE_OPTIONS } from '@/pages/settings/settingsLanguageOptions';

export default function BioSection({
  form,
  setForm,
  person,
  errors,
  handleChange,
  bioLanguageOptions,
  selectedBioLang,
  setSelectedBioLang,
  genderOptions,
  sameSexOnlyOptions,
  t,
}) {
  return (
    <Card
      title={t('library.performerEdit.profileIdentity') || 'Profile & Identity'}
      variant="flat-glass"
      padding="md"
    >
      <Stack gap="md">
        <Field fullWidth>
          <Inline justify="between" align="center" className="u-mb-xs">
            <span className={fieldStyles.label}>{t('library.performerEdit.biography') || 'Biography'}</span>
            <Inline gap="sm" align="center">
              <Text variant="small" color="secondary" className="u-wrap-none">
                {t('library.performerEdit.language') || 'Language:'}
              </Text>
              <div className="u-flex-1">
                <Dropdown
                  options={bioLanguageOptions}
                  value={selectedBioLang}
                  onChange={e => setSelectedBioLang(e.target.value)}
                  placeholder={t('library.performerEdit.language') || 'Language'}
                />
              </div>
            </Inline>
          </Inline>
          <textarea
            className="ui-input"
            rows={3}
            value={form.biographies?.[selectedBioLang] || ''}
            onChange={e => {
              const val = e.target.value;
              setForm(prev => ({
                ...prev,
                biographies: {
                  ...prev.biographies,
                  [selectedBioLang]: val
                }
              }));
            }}
            placeholder={`Write a custom biography in ${TARGET_LANGUAGE_OPTIONS.find(o => o.value === selectedBioLang)?.label || selectedBioLang}...`}
          />
        </Field>
        <Grid variant="split">
          {person?.is_adult && (
            <Dropdown
              label={t('library.performerEdit.gender') || 'Gender'}
              options={genderOptions}
              value={form.gender}
              onChange={e => handleChange('gender', e.target.value)}
              placeholder={t('common.select') || 'Select...'}
            />
          )}
          <Input
            label={t('library.performerEdit.birthday') || 'Birthday'}
            type="date"
            value={form.birthday}
            onChange={e => handleChange('birthday', e.target.value)}
            error={errors.birthday}
          />
          <Input
            label={t('library.performerEdit.placeOfBirth') || 'Place of Birth'}
            type="text"
            placeholder="e.g. Los Angeles, California"
            value={form.place_of_birth}
            onChange={e => handleChange('place_of_birth', e.target.value)}
          />
          {person?.is_adult && (
            <Dropdown
              label={t('library.performerEdit.sameSexOnly') || 'Same Sex Only'}
              options={sameSexOnlyOptions}
              value={form.same_sex_only}
              onChange={e => handleChange('same_sex_only', e.target.value)}
              placeholder="- Select -"
            />
          )}
        </Grid>
      </Stack>
    </Card>
  );
}

