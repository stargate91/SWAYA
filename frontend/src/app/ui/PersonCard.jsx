import PropTypes from 'prop-types';
import styles from './PersonCard.module.css';
import Inline from './Inline';
import Avatar from './Avatar';
import { Users } from './icons';

export default function PersonCard({
  name,
  role,
  avatarUrl,
  isActor = false,
  onClick,
  ...props
}) {
  return (
    <Inline
      gap="md"
      align="center"
      className={`${styles.card} ${isActor ? styles.actor : ''}`.trim()}
      onClick={onClick}
      {...props}
    >
      <Avatar
        src={avatarUrl}
        alt={name}
        fallbackIcon={<Users size={isActor ? 18 : 16} />}
      />
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        {role && <span className={styles.role}>{role}</span>}
      </div>
    </Inline>
  );
}

PersonCard.propTypes = {
  name: PropTypes.string.isRequired,
  role: PropTypes.string,
  avatarUrl: PropTypes.string,
  isActor: PropTypes.bool,
  onClick: PropTypes.func
};
