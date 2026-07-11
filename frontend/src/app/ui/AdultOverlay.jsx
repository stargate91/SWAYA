import PropTypes from 'prop-types';
import Badge from './Badge';
import './AdultOverlay.css';

export default function AdultOverlay({ variant = 'obscure', badgeText = '18+' }) {
  return (
    <div className={`ui-adult-overlay ui-adult-overlay--${variant}`}>
      {badgeText && <Badge family="adult" tone="danger">{badgeText}</Badge>}
    </div>
  );
}

AdultOverlay.propTypes = {
  variant: PropTypes.oneOf(['obscure', 'blur']),
  badgeText: PropTypes.string,
};
