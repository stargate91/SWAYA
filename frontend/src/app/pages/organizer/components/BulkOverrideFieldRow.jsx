import Checkbox from '../../../ui/Checkbox';
import styles from './OrganizerOverrideModalContent.module.css';

export default function BulkOverrideFieldRow({ label, checked, onChange, children }) {
  return (
    <div className={styles['organizer-override-field']}>
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={styles['organizer-override-field__checkbox-label']}
      >
        <span className={styles['organizer-override-field__label-text']}>{label}</span>
      </Checkbox>
      <div className={`${styles['organizer-override-field__input']} ${!checked ? styles['is-disabled'] : ''}`}>
        {children}
      </div>
    </div>
  );
}

