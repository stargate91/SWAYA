import modalStyles from '@/ui/Modal.module.css';

export default function DeleteListModalContent({ t }) {
  return (
    <p className={modalStyles['body-text']}>
      {t('lists.delete_confirm') || 'Are you sure you want to delete this list?'}
    </p>
  );
}
