import Card from '@/ui/Card';
import StructurePreviewPanel from './StructurePreviewPanel.jsx';
import Stack from '@/ui/Stack';
import Hint from '@/ui/Hint';

export default function SettingsLiveImpact({
  form,
  t,
  title,
  eyebrow,
  hint,
  filterType,
}) {
  return (
    <Card title={title} eyebrow={eyebrow}>
      <Stack gap="md">
        <Hint>
          {hint}
        </Hint>
        <StructurePreviewPanel form={form} t={t} filterType={filterType} />
      </Stack>
    </Card>
  );
}
