import { useState } from 'react';
import { Plus, Minus, Check } from '@/ui/icons';
import IconButton from '@/ui/IconButton';

export default function ResultAddButton({ added, onAdd, onRemove }) {
  const [isHovered, setIsHovered] = useState(false);

  if (added) {
    return (
      <IconButton
        variant={isHovered ? 'danger' : 'ghost'}
        size="sm"
        onClick={onRemove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={!isHovered ? 'add-people-modal__activation-btn--active' : ''}
      >
        {isHovered ? <Minus size={16} /> : <Check size={16} />}
      </IconButton>
    );
  }

  return (
    <IconButton
      variant="secondary"
      size="sm"
      onClick={onAdd}
    >
      <Plus size={16} />
    </IconButton>
  );
}
