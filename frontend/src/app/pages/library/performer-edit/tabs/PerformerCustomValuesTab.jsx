import { useState, useEffect, useMemo } from 'react';
import { useSavePersonCustomFieldsMutation } from '@/queries/libraryQueries';
import { usePersonDetailQuery } from '@/queries/metadataQueries';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import Input from '@/ui/Input';
import Dropdown from '@/ui/Dropdown';
import FloatingActionBar from '@/ui/FloatingActionBar';
import { TARGET_LANGUAGE_OPTIONS } from '@/pages/settings/settingsLanguageOptions';

export default function PerformerCustomValuesTab({ personId, person: initialPerson, onDirtyChange, isShaking }) {
  const { t } = useTranslation();
  const { toast } = useUi();
  const { data: fetchedPerson } = usePersonDetailQuery(personId);
  const person = fetchedPerson || initialPerson;
  const saveMutation = useSavePersonCustomFieldsMutation();
  const manualLink = person?.external_links?.find(l => l.provider === 'manual');
  const manualData = manualLink?.source_data || {};

  const genderOptions = [
    { value: '1', label: t('library.performerEdit.female') || 'Female' },
    { value: '2', label: t('library.performerEdit.male') || 'Male' },
    { value: '0', label: t('library.performerEdit.other') || 'Other' },
  ];

  const sameSexOnlyOptions = [
    { value: 'No', label: 'No' },
    { value: 'Yes', label: 'Yes' },
  ];

  const breastTypeOptions = [
    { value: 'NATURAL', label: t('library.performerEdit.breastTypes.natural') || 'Natural' },
    { value: 'FAKE', label: t('library.performerEdit.breastTypes.fake') || 'Fake / Implant' },
    { value: 'NA', label: t('library.performerEdit.breastTypes.na') || 'N/A' },
  ];

  const cupSizeOptions = [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
    { value: 'DD', label: 'DD' },
    { value: 'DDD', label: 'DDD' },
    { value: 'E', label: 'E' },
    { value: 'F', label: 'F' },
    { value: 'G', label: 'G' },
    { value: 'H', label: 'H' },
    { value: 'I', label: 'I' },
    { value: 'J', label: 'J' },
    { value: 'K', label: 'K' },
  ];

  const hairColorOptions = [
    { value: 'BLONDE', label: t('library.performerEdit.hairColors.blonde') || 'Blonde' },
    { value: 'BRUNETTE', label: t('library.performerEdit.hairColors.brunette') || 'Brunette' },
    { value: 'BLACK', label: t('library.performerEdit.hairColors.black') || 'Black' },
    { value: 'RED', label: t('library.performerEdit.hairColors.red') || 'Red' },
    { value: 'AUBURN', label: t('library.performerEdit.hairColors.auburn') || 'Auburn' },
    { value: 'GREY', label: t('library.performerEdit.hairColors.grey') || 'Grey' },
    { value: 'BALD', label: t('library.performerEdit.hairColors.bald') || 'Bald' },
    { value: 'VARIOUS', label: t('library.performerEdit.hairColors.various') || 'Various' },
    { value: 'WHITE', label: t('library.performerEdit.hairColors.white') || 'White' },
    { value: 'OTHER', label: t('library.performerEdit.hairColors.other') || 'Other' },
  ];

  const eyeColorOptions = [
    { value: 'BLUE', label: t('library.performerEdit.eyeColors.blue') || 'Blue' },
    { value: 'BROWN', label: t('library.performerEdit.eyeColors.brown') || 'Brown' },
    { value: 'GREY', label: t('library.performerEdit.eyeColors.grey') || 'Grey' },
    { value: 'GREEN', label: t('library.performerEdit.eyeColors.green') || 'Green' },
    { value: 'HAZEL', label: t('library.performerEdit.eyeColors.hazel') || 'Hazel' },
    { value: 'RED', label: t('library.performerEdit.eyeColors.red') || 'Red' },
  ];

  const ethnicityOptions = [
    { value: 'CAUCASIAN', label: t('library.performerEdit.ethnicities.caucasian') || 'Caucasian' },
    { value: 'BLACK', label: t('library.performerEdit.ethnicities.black') || 'Black' },
    { value: 'ASIAN', label: t('library.performerEdit.ethnicities.asian') || 'Asian' },
    { value: 'INDIAN', label: t('library.performerEdit.ethnicities.indian') || 'Indian' },
    { value: 'LATIN', label: t('library.performerEdit.ethnicities.latin') || 'Latin' },
    { value: 'MIDDLE_EASTERN', label: t('library.performerEdit.ethnicities.middle_eastern') || 'Middle Eastern' },
    { value: 'MIXED', label: t('library.performerEdit.ethnicities.mixed') || 'Mixed' },
    { value: 'OTHER', label: t('library.performerEdit.ethnicities.other') || 'Other' },
  ];

  const buttShapeOptions = [
    { value: 'BUBBLE', label: t('library.performerEdit.buttShapes.bubble') || 'Bubble' },
    { value: 'HEART', label: t('library.performerEdit.buttShapes.heart') || 'Heart' },
    { value: 'SQUARE', label: t('library.performerEdit.buttShapes.square') || 'Square' },
    { value: 'FLAT', label: t('library.performerEdit.buttShapes.flat') || 'Flat' },
  ];

  const buttSizeOptions = [
    { value: 'SMALL', label: t('library.performerEdit.buttSizes.small') || 'Small' },
    { value: 'MEDIUM', label: t('library.performerEdit.buttSizes.medium') || 'Medium' },
    { value: 'BIG', label: t('library.performerEdit.buttSizes.big') || 'Big' },
  ];

  const getDropdownOptions = (standardOptions, currentValue) => {
    if (!currentValue) return standardOptions;
    const upperValue = currentValue.toUpperCase();
    const exists = standardOptions.some(opt => opt.value === upperValue);
    if (exists) return standardOptions;
    const label = currentValue.charAt(0).toUpperCase() + currentValue.slice(1).toLowerCase();
    return [...standardOptions, { value: upperValue, label }];
  };

  const [selectedBioLang, setSelectedBioLang] = useState('en');

  const [prevManualLink, setPrevManualLink] = useState(manualLink);
  const [initialForm, setInitialForm] = useState(() => {
    const initialized = {
      name: manualData.name || '',
      alternate_names: manualData.alternate_names || [],
      biographies: manualData.biographies || (manualData.biography ? { en: manualData.biography } : {}),
      birthday: manualData.birthday || '',
      place_of_birth: manualData.place_of_birth || '',
      gender: manualData.gender !== undefined ? String(manualData.gender) : '',
      height: manualData.height !== undefined ? String(manualData.height) : '',
      weight: manualData.weight !== undefined ? String(manualData.weight) : '',
      hair_color: manualData.hair_color ? manualData.hair_color.toUpperCase() : '',
      eye_color: manualData.eye_color ? manualData.eye_color.toUpperCase() : '',
      ethnicity: manualData.ethnicity ? manualData.ethnicity.toUpperCase() : '',
      measurements: manualData.measurements || '',
      cup_size: manualData.cup_size || '',
      band_size: manualData.band_size !== undefined ? String(manualData.band_size) : '',
      waist: manualData.waist !== undefined ? String(manualData.waist) : '',
      hip: manualData.hip !== undefined ? String(manualData.hip) : '',
      tattoos: manualData.tattoos || '',
      piercings: manualData.piercings || '',
      breast_type: manualData.breast_type || '',
      same_sex_only: manualData.same_sex_only || '',
      butt_shape: manualData.butt_shape || '',
      butt_size: manualData.butt_size || '',
    };
    return initialized;
  });
  const [form, setForm] = useState(initialForm);

  const isMale = String(form.gender) === '2' || (form.gender === '' && String(person?.gender) === '2');

  const isUnderage = useMemo(() => {
    if (person?.is_adult) return false;
    const bday = form.birthday || person?.birthday;
    if (!bday) return false;
    const birthDate = new Date(bday);
    if (isNaN(birthDate.getTime())) return false;
    const today = new Date();
    const minDate = new Date(birthDate.getFullYear() + 18, birthDate.getMonth(), birthDate.getDate());
    minDate.setDate(minDate.getDate() + 14);
    return minDate > today;
  }, [form.birthday, person?.birthday, person?.is_adult]);

  if (prevManualLink !== manualLink) {
    setPrevManualLink(manualLink);
    const initialized = {
      name: manualData.name || '',
      alternate_names: manualData.alternate_names || [],
      biographies: manualData.biographies || (manualData.biography ? { en: manualData.biography } : {}),
      birthday: manualData.birthday || '',
      place_of_birth: manualData.place_of_birth || '',
      gender: manualData.gender !== undefined ? String(manualData.gender) : '',
      height: manualData.height !== undefined ? String(manualData.height) : '',
      weight: manualData.weight !== undefined ? String(manualData.weight) : '',
      hair_color: manualData.hair_color ? manualData.hair_color.toUpperCase() : '',
      eye_color: manualData.eye_color ? manualData.eye_color.toUpperCase() : '',
      ethnicity: manualData.ethnicity ? manualData.ethnicity.toUpperCase() : '',
      measurements: manualData.measurements || '',
      cup_size: manualData.cup_size || '',
      band_size: manualData.band_size !== undefined ? String(manualData.band_size) : '',
      waist: manualData.waist !== undefined ? String(manualData.waist) : '',
      hip: manualData.hip !== undefined ? String(manualData.hip) : '',
      tattoos: manualData.tattoos || '',
      piercings: manualData.piercings || '',
      breast_type: manualData.breast_type || '',
      same_sex_only: manualData.same_sex_only || '',
      butt_shape: manualData.butt_shape || '',
      butt_size: manualData.butt_size || '',
    };
    setInitialForm(initialized);
    setForm(initialized);
  }

  const handleChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    if (initialForm) {
      setForm(initialForm);
    }
  };

  const errors = (() => {
    const errs = {};
    if (form.height) {
      const h = Number(form.height);
      if (isNaN(h) || h < 50 || h > 300) {
        errs.height = t('performerEdit.validation.height');
      }
    }
    if (form.weight) {
      const w = Number(form.weight);
      if (isNaN(w) || w < 30 || w > 300) {
        errs.weight = t('performerEdit.validation.weight');
      }
    }
    if (form.cup_size) {
      if (!/^[A-Z]{1,3}$/.test(form.cup_size)) {
        errs.cup_size = t('performerEdit.validation.cupSize');
      }
    }
    if (form.band_size) {
      const b = Number(form.band_size);
      if (isNaN(b) || b < 10 || b > 100) {
        errs.band_size = t('performerEdit.validation.bandSize');
      }
    }
    if (form.waist) {
      const w = Number(form.waist);
      if (isNaN(w) || w < 10 || w > 100) {
        errs.waist = t('performerEdit.validation.waist');
      }
    }
    if (form.hip) {
      const h = Number(form.hip);
      if (isNaN(h) || h < 10 || h > 100) {
        errs.hip = t('performerEdit.validation.hip');
      }
    }
    if (person?.is_adult && form.birthday) {
      const birthDate = new Date(form.birthday);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        const minDate = new Date(birthDate.getFullYear() + 18, birthDate.getMonth(), birthDate.getDate());
        minDate.setDate(minDate.getDate() + 14);
        if (minDate > today) {
          errs.birthday = t('performerEdit.validation.underage') || 'Performer must be at least 18 years and 2 weeks old';
        }
      }
    }
    return errs;
  })();

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (Object.keys(errors).length > 0) {
      toast(t('performerEdit.validation.correctErrors'), 'danger');
      return;
    }
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'biographies') {
          const cleanedBios = {};
          Object.entries(v || {}).forEach(([lang, val]) => {
            if (val && val.trim() !== '') {
              cleanedBios[lang] = val;
            }
          });
          payload['biographies'] = cleanedBios;
        } else if (v === '') {
          payload[k] = null;
        } else if (k === 'gender' || k === 'height' || k === 'weight' || k === 'band_size' || k === 'waist' || k === 'hip') {
          payload[k] = Number(v);
        } else {
          payload[k] = v;
        }
      });
      payload['measurements'] = computedMeasurements || null;

      await saveMutation.mutateAsync({
        personId: person.id,
        fields: payload,
      });
      setInitialForm(form);
      toast('Custom values saved successfully!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save custom values', 'danger');
    }
  };

  const computedMeasurements = (() => {
    const parts = [];
    if (form.band_size && form.cup_size) {
      parts.push(`${form.band_size}${form.cup_size}`);
    } else if (form.cup_size) {
      parts.push(form.cup_size);
    } else if (form.band_size) {
      parts.push(form.band_size);
    }

    if (form.waist && form.hip) {
      parts.push(`${form.waist}-${form.hip}`);
    } else if (form.waist) {
      parts.push(form.waist);
    } else if (form.hip) {
      parts.push(form.hip);
    }
    return parts.join('-');
  })();

  const isDirty = initialForm && Object.keys(form).some(key => {
    if (key === 'measurements') return false;
    if (key === 'biographies') {
      const current = form[key] || {};
      const initial = initialForm[key] || {};
      const allKeys = new Set([...Object.keys(current), ...Object.keys(initial)]);
      for (const k of allKeys) {
        if ((current[k] || '') !== (initial[k] || '')) return true;
      }
      return false;
    }
    return form[key] !== initialForm[key];
  });

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(Boolean(isDirty));
    }
  }, [isDirty, onDirtyChange]);

  const bioLanguageOptions = TARGET_LANGUAGE_OPTIONS.map(opt => ({
    value: opt.value,
    label: `${opt.label} ${form.biographies?.[opt.value] ? '✓' : ''}`.trim()
  }));

  return (
    <form onSubmit={handleSave} className="custom-values-form settings-tab-content">
      <div className="custom-values-header">
        <h3 className="settings-section-title">{t('library.performerEdit.manualOverrides') || 'Manual Overrides'}</h3>
        <p className="settings-section-subtitle">{t('library.performerEdit.manualOverridesSubtitle') || 'Set your own values for performer attributes. These take priority if manual routing is selected.'}</p>
      </div>

      <div className="custom-values-cards-grid">
        {/* Card 1: Profile & Identity */}
        <div className="custom-values-card">
          <div className="custom-values-card__header">
            <h4 className="custom-values-card__title">{t('library.performerEdit.profileIdentity') || 'Profile & Identity'}</h4>
          </div>
          <div className="custom-values-card__body">
            <div className="ui-field custom-values-field--full">
              <div className="performer-custom-values-header-row">
                <label className="ui-field__label performer-custom-values-biography-label">{t('library.performerEdit.biography') || 'Biography'}</label>
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
            </div>
            <div className="custom-values-card__grid-2">
              {person?.is_adult && (
                <Dropdown
                  label="Gender"
                  options={genderOptions}
                  value={form.gender}
                  onChange={e => handleChange('gender', e.target.value)}
                  placeholder="- Select -"
                />
              )}
              <div className="ui-field">
                <label className="ui-field__label">{t('library.performerEdit.birthday') || 'Birthday'}</label>
                <Input
                  type="date"
                  value={form.birthday}
                  onChange={e => handleChange('birthday', e.target.value)}
                  error={errors.birthday}
                />
              </div>
              <div className="ui-field">
                <label className="ui-field__label">{t('library.performerEdit.placeOfBirth') || 'Place of Birth'}</label>
                <Input
                  type="text"
                  placeholder="e.g. Los Angeles, California"
                  value={form.place_of_birth}
                  onChange={e => handleChange('place_of_birth', e.target.value)}
                />
              </div>
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

        {/* Card 2: Features & Appearance */}
        <div className="custom-values-card">
          <div className="custom-values-card__header">
            <h4 className="custom-values-card__title">{t('library.performerEdit.featuresAppearance') || 'Features & Appearance'}</h4>
          </div>
          <div className="custom-values-card__body">
            <div className="custom-values-card__grid-2">
              {!isUnderage && (
                <div className="ui-field">
                  <label className="ui-field__label">{t('library.performerEdit.heightCm') || 'Height (cm)'}</label>
                  <Input
                    type="number"
                    placeholder="e.g. 170"
                    value={form.height}
                    onChange={e => handleChange('height', e.target.value)}
                    error={errors.height}
                  />
                </div>
              )}
              {!isUnderage && (
                <div className="ui-field">
                  <label className="ui-field__label">{t('library.performerEdit.weightKg') || 'Weight (kg)'}</label>
                  <Input
                    type="number"
                    placeholder="e.g. 60"
                    value={form.weight}
                    onChange={e => handleChange('weight', e.target.value)}
                    error={errors.weight}
                  />
                </div>
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
            </div>
          </div>
        </div>

        {/* Card 3: Body & Measurements */}
        {!isMale && !isUnderage && (
          <div className="custom-values-card">
            <div className="custom-values-card__header">
              <h4 className="custom-values-card__title">{t('library.performerEdit.bodyMeasurements') || 'Body & Measurements'}</h4>
            </div>
            <div className="custom-values-card__body">
              <div className="custom-values-card__grid-2">
                <div className="ui-field">
                  <label className="ui-field__label">{t('library.performerEdit.measurementsPreview') || 'Measurements (Preview)'}</label>
                  <Input
                    type="text"
                    placeholder="e.g. 34B-24-34"
                    value={computedMeasurements}
                    disabled
                  />
                </div>
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
                <div className="ui-field">
                  <label className="ui-field__label">{t('library.performerEdit.bandSize') || 'Band Size'}</label>
                  <Input
                    type="number"
                    placeholder="e.g. 34"
                    value={form.band_size}
                    onChange={e => handleChange('band_size', e.target.value.replace(/\D/g, ''))}
                    min={10}
                    max={100}
                    step={1}
                    error={errors.band_size}
                  />
                </div>
                <div className="ui-field">
                  <label className="ui-field__label">{t('library.performerEdit.waistInches') || 'Waist (inches)'}</label>
                  <Input
                    type="number"
                    placeholder="e.g. 24"
                    value={form.waist}
                    onChange={e => handleChange('waist', e.target.value.replace(/\D/g, ''))}
                    min={10}
                    max={100}
                    step={1}
                    error={errors.waist}
                  />
                </div>
                <div className="ui-field">
                  <label className="ui-field__label">{t('library.performerEdit.hipInches') || 'Hip (inches)'}</label>
                  <Input
                    type="number"
                    placeholder="e.g. 34"
                    value={form.hip}
                    onChange={e => handleChange('hip', e.target.value.replace(/\D/g, ''))}
                    min={10}
                    max={100}
                    step={1}
                    error={errors.hip}
                  />
                </div>
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
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Modifications */}
        <div className="custom-values-card">
          <div className="custom-values-card__header">
            <h4 className="custom-values-card__title">{t('library.performerEdit.modifications') || 'Modifications'}</h4>
          </div>
          <div className="custom-values-card__body">
            <div className="custom-values-card__grid-2">
              <div className="ui-field custom-values-field--full-grid">
                <label className="ui-field__label">{t('library.details.tattoos') || 'Tattoos'}</label>
                <Input
                  type="text"
                  placeholder="e.g. Rose on left shoulder"
                  value={form.tattoos}
                  onChange={e => handleChange('tattoos', e.target.value)}
                />
              </div>
              <div className="ui-field custom-values-field--full-grid">
                <label className="ui-field__label">{t('library.details.piercings') || 'Piercings'}</label>
                <Input
                  type="text"
                  placeholder="e.g. Nose ring"
                  value={form.piercings}
                  onChange={e => handleChange('piercings', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(isDirty)}
        className={isShaking ? 'is-shaking' : ''}
        title={t('settingsPage.unsavedChanges.title')}
        actions={[
          {
            key: 'reset',
            label: t('library.performerEdit.back') || 'Reset',
            onClick: handleReset,
            disabled: saveMutation.isPending,
          },
          {
            key: 'save',
            label: saveMutation.isPending ? (t('library.performerEdit.saving') || 'Saving...') : (t('library.performerEdit.saveChanges') || 'Save Changes'),
            onClick: handleSave,
            disabled: saveMutation.isPending || Object.keys(errors).length > 0,
            variant: 'primary',
          },
        ]}
      />
    </form>
  );
}
