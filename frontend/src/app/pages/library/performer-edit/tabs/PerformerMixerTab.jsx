import { useState, useMemo } from 'react';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import { useSetPersonFieldRoutingMutation } from '@/queries';
import { usePersonDetailQuery } from '@/queries/metadataQueries';
import { Check } from '@/ui/icons';

export default function PerformerMixerTab({ person: initialPerson }) {
  const { t } = useTranslation();
  const { toast } = useUi();
  const routingMutation = useSetPersonFieldRoutingMutation();

  const { data: fetchedPerson } = usePersonDetailQuery(initialPerson?.id);
  const person = fetchedPerson || initialPerson;

  const [prevFieldRouting, setPrevFieldRouting] = useState(person?.field_routing);
  const [localRouting, setLocalRouting] = useState(person?.field_routing || {});

  if (person?.field_routing !== prevFieldRouting) {
    setPrevFieldRouting(person?.field_routing);
    setLocalRouting(person?.field_routing || {});
  }

  const currentRouting = localRouting || {};

  const isMale = String(person?.gender) === '2';

  const isUnderage = useMemo(() => {
    if (person?.is_adult) return false;
    const bday = person?.birthday;
    if (!bday) return false;
    const birthDate = new Date(bday);
    if (isNaN(birthDate.getTime())) return false;
    const today = new Date();
    const minDate = new Date(birthDate.getFullYear() + 18, birthDate.getMonth(), birthDate.getDate());
    minDate.setDate(minDate.getDate() + 14);
    return minDate > today;
  }, [person?.birthday, person?.is_adult]);

  const FIELDS = [
    { key: 'biography', label: 'Biography', type: 'text' },
    { key: 'birthday', label: 'Birthday', type: 'string' },
    { key: 'place_of_birth', label: 'Place of Birth', type: 'string' },
    ...(person?.is_adult ? [{ key: 'gender', label: 'Gender', type: 'gender' }] : []),
    ...(!isUnderage ? [
      { key: 'height', label: 'Height', type: 'height' },
      { key: 'weight', label: 'Weight', type: 'weight' },
      { key: 'hair_color', label: 'Hair Color', type: 'string' },
      { key: 'eye_color', label: 'Eye Color', type: 'string' },
    ] : []),
    { key: 'ethnicity', label: 'Ethnicity', type: 'string' },
    ...(!isMale && !isUnderage
      ? [
        { key: 'measurements', label: 'Measurements', type: 'string' },
        { key: 'cup_size', label: 'Cup Size', type: 'string' },
        { key: 'band_size', label: 'Band Size', type: 'string' },
        { key: 'waist', label: 'Waist', type: 'string' },
        { key: 'hip', label: 'Hip', type: 'string' },
        { key: 'breast_type', label: 'Breast Type', type: 'string' },
        { key: 'butt_shape', label: 'Butt Shape', type: 'string' },
        { key: 'butt_size', label: 'Butt Size', type: 'string' },
      ]
      : []),
    { key: 'tattoos', label: 'Tattoos', type: 'string' },
    { key: 'piercings', label: 'Piercings', type: 'string' },
    ...(person?.is_adult ? [{ key: 'same_sex_only', label: 'Same Sex Only', type: 'same_sex_only' }] : []),
  ];

  const PROVIDERS = person?.is_adult
    ? [
      { key: 'tmdb', label: 'TMDb' },
      { key: 'stashdb', label: 'StashDB' },
      { key: 'fansdb', label: 'FansDB' },
      { key: 'porndb', label: 'THEPornDB' },
      { key: 'manual', label: 'Custom' },
    ]
    : [
      { key: 'tmdb', label: 'TMDb' },
      { key: 'manual', label: 'Custom' },
    ];

  // Helper to format values nicely in the grid
  const formatValue = (val, type, fieldKey) => {
    if (val === undefined || val === null || val === '') return '-';
    if (fieldKey === 'butt_size') {
      const lower = String(val).toLowerCase();
      if (lower === 'small') return t('library.performerEdit.buttSizes.small') || 'Small';
      if (lower === 'medium') return t('library.performerEdit.buttSizes.medium') || 'Medium';
      if (lower === 'big') return t('library.performerEdit.buttSizes.big') || 'Big';
      if (lower === 'extra_big') return t('library.performerEdit.buttSizes.extra_big') || 'Extra Big';
    }
    if (type === 'same_sex_only') {
      if (val === 'Same-Sex Only') return 'Yes';
      if (val === 'All') return 'No';
      return val;
    }
    if (type === 'gender') {
      if (val === 1 || val === '1') return 'Female';
      if (val === 2 || val === '2') return 'Male';
      return 'Other';
    }
    if (type === 'height') {
      return `${val} cm`;
    }
    if (type === 'weight') {
      return `${val} kg`;
    }
    if (type === 'text') {
      // Show biography snippet
      if (typeof val === 'object') {
        const text = val.en || val.hu || Object.values(val)[0] || '';
        return text.length > 60 ? text.substring(0, 60) + '...' : text;
      }
      return val.length > 60 ? val.substring(0, 60) + '...' : val;
    }
    const strVal = String(val);
    const lower = strVal.toLowerCase();
    if (lower === 'no piercings' || lower === 'no tattoos') {
      return 'No';
    }
    return strVal;
  };

  const calculateButtSize = (height, waist, hip) => {
    try {
      const h = parseFloat(height);
      const w = parseFloat(waist);
      const hp = parseFloat(hip);
      if (isNaN(h) || isNaN(w) || isNaN(hp) || h === 0 || hp === 0 || w === 0) return null;
      
      const heightIn = h / 2.54;
      const fah = hp / (heightIn * 0.53);
      const whr = w / hp;
      if (whr === 0) return null;
      const ccf = 0.72 / whr;
      const bcs = hp * fah * ccf;

      if (bcs < 33) return 'SMALL';
      if (bcs < 40) return 'MEDIUM';
      if (bcs < 50) return 'BIG';
      return 'EXTRA_BIG';
    } catch (e) {
      return null;
    }
  };

  // Helper to get raw value of a field from a specific provider
  const getProviderValue = (providerKey, fieldKey) => {
    const keys = [providerKey];
    if (providerKey === 'porndb') keys.push('theporndb');
    if (providerKey === 'theporndb') keys.push('porndb');

    const link = person?.external_links?.find(l => keys.includes(l.provider));
    if (!link || !link.source_data) return null;
    if (fieldKey === 'biography') {
      return link.source_data.biographies || link.source_data.biography;
    }
    
    if (fieldKey === 'butt_size') {
      const rawButtSize = link.source_data.butt_size;
      if (rawButtSize) return rawButtSize;
      
      const h = link.source_data.height;
      const w = link.source_data.waist;
      const hp = link.source_data.hip;
      const computed = calculateButtSize(h, w, hp);
      if (computed) return computed;
    }

    return link.source_data[fieldKey];
  };

  const handleSelectRoute = async (fieldKey, providerKey) => {
    const newRouting = { ...currentRouting };
    if (providerKey === 'auto') {
      delete newRouting[fieldKey];
    } else {
      newRouting[fieldKey] = providerKey;
    }

    setLocalRouting(newRouting);

    try {
      await routingMutation.mutateAsync({
        personId: person.id,
        routing: newRouting,
      });
      toast(t('performer.mixer.routing_updated') || 'Metadata routing updated successfully!', 'success');
    } catch (err) {
      setLocalRouting(person?.field_routing || {});
      toast(err.message || t('performer.mixer.routing_update_failed') || 'Failed to update routing', 'danger');
    }
  };

  // Check if a specific source is linked
  const isSourceLinked = (providerKey) => {
    if (providerKey === 'manual') return true;
    const keys = [providerKey];
    if (providerKey === 'porndb') keys.push('theporndb');
    if (providerKey === 'theporndb') keys.push('porndb');
    return person?.external_links?.some(l => keys.includes(l.provider));
  };

  return (
    <div className="link-source-modal link-source-modal--mixer-view link-source-modal--embedded">
      <div className="data-mixer-grid-container">
        <table className="data-mixer-table">
          <thead>
            <tr>
              <th className="mixer-th-field">{t('library.performerEdit.field') || 'Field'}</th>
              <th className="mixer-th-source">{t('library.performerEdit.autoDefault') || 'Auto (Default)'}</th>
              {PROVIDERS.map(p => (
                <th key={p.key} className={`mixer-th-source ${!isSourceLinked(p.key) ? 'mixer-th-disabled' : ''}`}>
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(field => {
              const activeRoute = currentRouting[field.key] || 'auto';
              const autoVal = getAutoValue(field.key);
              const formattedAutoVal = formatValue(autoVal, field.type, field.key);

              return (
                <tr key={field.key} className="mixer-row">
                  <td className="mixer-td-field-label">
                    {field.label}
                  </td>
                  {/* Auto routing option */}
                  <td
                    onClick={() => handleSelectRoute(field.key, 'auto')}
                    className={`mixer-td-cell mixer-td-cell--auto ${activeRoute === 'auto' ? 'mixer-td-cell--active' : ''}`}
                  >
                    <div className="mixer-cell-content">
                      <span className="mixer-cell-value">
                        {formattedAutoVal !== '-' ? (
                          <>
                            <span className="mixer-cell-auto-label" style={{ opacity: 0.45, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>Auto: </span>
                            <span className="mixer-cell-auto-value" style={{ fontWeight: 500 }}>{formattedAutoVal}</span>
                          </>
                        ) : (
                          t('library.performerEdit.defaultPriority') || 'Default Priority'
                        )}
                      </span>
                      {activeRoute === 'auto' && <Check size={14} className="mixer-check-icon" />}
                    </div>
                  </td>
                  {PROVIDERS.map(p => {
                    const isLinked = isSourceLinked(p.key);
                    const rawVal = getProviderValue(p.key, field.key);
                    const formatted = formatValue(rawVal, field.type, field.key);
                    const isSelected = activeRoute === p.key;

                    const hasValue = (() => {
                      if (rawVal === null || rawVal === undefined || rawVal === '') return false;
                      if (formatted === '-') return false;
                      if (typeof rawVal === 'object') {
                        const values = Object.values(rawVal);
                        if (values.length === 0) return false;
                        if (values.every(v => v === null || v === undefined || String(v).trim() === '')) return false;
                      }
                      if (String(rawVal).trim() === '') return false;
                      return true;
                    })();

                    return (
                      <td
                        key={p.key}
                        onClick={() => isLinked && hasValue && handleSelectRoute(field.key, p.key)}
                        className={`mixer-td-cell ${!isLinked || !hasValue ? 'mixer-td-cell--disabled' : ''} ${isSelected ? 'mixer-td-cell--active' : ''} ${p.key === 'manual' ? 'mixer-td-cell--manual' : ''}`}
                      >
                        <div className="mixer-cell-content">
                          <span className="mixer-cell-value" title={rawVal && typeof rawVal === 'string' ? rawVal : ''}>
                            {formatted}
                          </span>
                          {isSelected && <Check size={14} className="mixer-check-icon" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
