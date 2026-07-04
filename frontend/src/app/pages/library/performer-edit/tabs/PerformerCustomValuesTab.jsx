import { useState, useEffect, useMemo } from 'react';
import { useSavePersonCustomFieldsMutation } from '@/queries';
import { usePersonDetailQuery } from '@/queries/metadataQueries';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import FloatingActionBar from '@/ui/FloatingActionBar';
import { TARGET_LANGUAGE_OPTIONS } from '@/pages/settings/settingsLanguageOptions';
import {
  getGenderOptions,
  getSameSexOnlyOptions,
  getBreastTypeOptions,
  getCupSizeOptions,
  getHairColorOptions,
  getEyeColorOptions,
  getEthnicityOptions,
  getButtShapeOptions,
  getButtSizeOptions,
  getDropdownOptions,
} from './performerCustomValuesConfig';
import BioSection from './components/BioSection';
import PhysicalAttributesSection from './components/PhysicalAttributesSection';
import MeasurementsSection from './components/MeasurementsSection';
import ModificationsSection from './components/ModificationsSection';

export default function PerformerCustomValuesTab({ personId, person: initialPerson, onDirtyChange, isShaking }) {
  const { t } = useTranslation();
  const { toast } = useUi();
  const { data: fetchedPerson } = usePersonDetailQuery(personId);
  const person = fetchedPerson || initialPerson;
  const saveMutation = useSavePersonCustomFieldsMutation();
  const manualLink = person?.external_links?.find(l => l.provider === 'manual');
  const manualData = manualLink?.source_data || {};

  const genderOptions = getGenderOptions(t);
  const sameSexOnlyOptions = getSameSexOnlyOptions();
  const breastTypeOptions = getBreastTypeOptions(t);
  const cupSizeOptions = getCupSizeOptions();
  const hairColorOptions = getHairColorOptions(t);
  const eyeColorOptions = getEyeColorOptions(t);
  const ethnicityOptions = getEthnicityOptions(t);
  const buttShapeOptions = getButtShapeOptions(t);
  const buttSizeOptions = getButtSizeOptions(t);

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
      toast(t('performer.custom.values_saved') || 'Custom values saved successfully!', 'success');
    } catch (err) {
      toast(err.message || t('performer.custom.save_values_failed') || 'Failed to save custom values', 'danger');
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
        <BioSection
          form={form}
          setForm={setForm}
          person={person}
          errors={errors}
          handleChange={handleChange}
          bioLanguageOptions={bioLanguageOptions}
          selectedBioLang={selectedBioLang}
          setSelectedBioLang={setSelectedBioLang}
          genderOptions={genderOptions}
          sameSexOnlyOptions={sameSexOnlyOptions}
          t={t}
        />

        <PhysicalAttributesSection
          form={form}
          errors={errors}
          handleChange={handleChange}
          isUnderage={isUnderage}
          hairColorOptions={hairColorOptions}
          eyeColorOptions={eyeColorOptions}
          ethnicityOptions={ethnicityOptions}
          getDropdownOptions={getDropdownOptions}
          t={t}
        />

        {!isMale && !isUnderage && (
          <MeasurementsSection
            form={form}
            errors={errors}
            handleChange={handleChange}
            computedMeasurements={computedMeasurements}
            breastTypeOptions={breastTypeOptions}
            cupSizeOptions={cupSizeOptions}
            buttShapeOptions={buttShapeOptions}
            buttSizeOptions={buttSizeOptions}
            getDropdownOptions={getDropdownOptions}
            t={t}
          />
        )}

        <ModificationsSection
          form={form}
          handleChange={handleChange}
          t={t}
        />
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
