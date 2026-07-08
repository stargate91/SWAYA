import PropTypes from 'prop-types';
import './AdultOverlay.css';

export default function AdultOverlay({ variant = 'obscure', badgeText = '18+' }) {
  return (
    <div className={`ui-adult-overlay ui-adult-overlay--${variant}`}>
      <span className="settings-badge settings-badge--danger">{badgeText}</span>
    </div>
  );
}

AdultOverlay.propTypes = {
  variant: PropTypes.oneOf(['obscure', 'blur']),
  badgeText: PropTypes.string,
};
