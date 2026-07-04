import { useState } from 'react';
import IconButton from '@/ui/IconButton';
import { Check, Minus, Plus } from '@/ui/icons';

export default function ActivationButton({ isActive, onClick, disabled }) {
  const [isHovered, setIsHovered] = useState(false);

  if (isActive) {
    return (
      <IconButton
        variant={isHovered ? 'danger' : 'ghost'}
        size="sm"
        onClick={() => onClick(false)}
        disabled={disabled}
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
      onClick={() => onClick(true)}
      disabled={disabled}
    >
      <Plus size={16} />
    </IconButton>
  );
}
