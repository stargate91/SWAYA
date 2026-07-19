import Card from '@/ui/Card';
import Grid from '@/ui/Grid';
import Input from '@/ui/Input';

export default function ModificationsSection({
  form,
  handleChange,
  t,
}) {
  return (
    <Card
      title={t('library.performerEdit.modifications') || 'Modifications'}
      variant="flat-glass"
      padding="md"
    >
      <Grid variant="split">
        <Input
          label={t('library.details.tattoos') || 'Tattoos'}
          type="text"
          placeholder="e.g. Rose on left shoulder"
          value={form.tattoos}
          onChange={e => handleChange('tattoos', e.target.value)}
          className="u-span-2"
        />
        <Input
          label={t('library.details.piercings') || 'Piercings'}
          type="text"
          placeholder="e.g. Nose ring"
          value={form.piercings}
          onChange={e => handleChange('piercings', e.target.value)}
          className="u-span-2"
        />
      </Grid>
    </Card>
  );
}

