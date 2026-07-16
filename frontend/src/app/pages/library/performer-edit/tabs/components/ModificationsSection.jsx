import Input from '@/ui/Input';

export default function ModificationsSection({
  form,
  handleChange,
  t,
}) {
  return (
    <div className="custom-values-card">
      <div className="custom-values-card__header">
        <h4 className="custom-values-card__title">{t('library.performerEdit.modifications') || 'Modifications'}</h4>
      </div>
      <div className="custom-values-card__body">
        <div className="custom-values-card__grid-2">
          <Input
            label={t('library.details.tattoos') || 'Tattoos'}
            type="text"
            placeholder="e.g. Rose on left shoulder"
            value={form.tattoos}
            onChange={e => handleChange('tattoos', e.target.value)}
            className="custom-values-field--full-grid"
          />
          <Input
            label={t('library.details.piercings') || 'Piercings'}
            type="text"
            placeholder="e.g. Nose ring"
            value={form.piercings}
            onChange={e => handleChange('piercings', e.target.value)}
            className="custom-values-field--full-grid"
          />
        </div>
      </div>
    </div>
  );
}
