import Input from '@/ui/Input';
import { useSettingsField } from '../../SettingsFormContext.jsx';

export default function SettingsTextField({ field, onChange, ...props }) {
  const fieldState = useSettingsField(field);

  return (
    <Input
      {...props}
      value={fieldState.value ?? ''}
      error={'error' in props ? props.error : fieldState.error}
      disabled={'disabled' in props ? props.disabled : fieldState.disabled}
      onChange={onChange || fieldState.onChange}
    />
  );
}

