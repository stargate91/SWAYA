import Card from '@/ui/Card';
import Text from '@/ui/Text';
import Stack from '@/ui/Stack';

export default function SettingsInstructionsBox({ title, steps }) {
  return (
    <Card variant="soft" padding="md">
      <Stack gap="sm">
        {title && (
          <Text variant="body" weight="semibold" color="primary">
            {title}
          </Text>
        )}
        <Stack gap="xs" as="ol">
          {steps.map((step, index) => (
            <Text variant="caption" color="secondary" as="li" key={index}>
              {step}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
