export default function DeleteListModalContent({ t }) {
  return (
    <p className="ui-modal__body-text">
      {t('lists.delete_confirm') || 'Are you sure you want to delete this list?'}
    </p>
  );
}
