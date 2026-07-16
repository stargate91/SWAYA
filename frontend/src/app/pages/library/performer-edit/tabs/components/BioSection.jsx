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
    <div className="custom-values-card">
      <div className="custom-values-card__header">
        <h4 className="custom-values-card__title">{t('library.performerEdit.profileIdentity') || 'Profile & Identity'}</h4>
      </div>
      <div className="custom-values-card__body">
        <Field className="custom-values-field--full">
          <div className="performer-custom-values-header-row">
            <span className={`${fieldStyles.label} performer-custom-values-biography-label`}>{t('library.performerEdit.biography') || 'Biography'}</span>
            <div className="performer-custom-values-language-selector-wrapper">
              <span className="performer-custom-values-language-label">{t('library.performerEdit.language') || 'Language:'}</span>
              <div className="performer-custom-values-language-dropdown-container">
                <Dropdown
                  options={bioLanguageOptions}
                  value={selectedBioLang}
                  onChange={e => setSelectedBioLang(e.target.value)}
                  placeholder={t('library.performerEdit.language') || 'Language'}
                />
              </div>
            </div>
          </div>
          <textarea
            className="ui-input performer-custom-values-bio"
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
        <div className="custom-values-card__grid-2">
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
        </div>
      </div>
    </div>
  );
}
