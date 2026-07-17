import styles from './OnboardingInfoCard.module.css';

export default function OnboardingInfoCard({
  visual,
  kicker,
  title,
  description,
  items = [],
}) {
  return (
    <div className={styles['onboarding-info-panel']}>
      {visual}
      {kicker ? <span className={styles['welcome-kicker']}>{kicker}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}

      {items.length > 0 ? (
        <div className={styles['feature-list']}>
          {items.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
            <div className={styles['feature-item']} key={itemTitle}>
              <span className={styles['feature-icon']}>{Icon ? <Icon size={18} /> : null}</span>
              <div>
                <strong>{itemTitle}</strong>
                <p>{itemDescription}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
