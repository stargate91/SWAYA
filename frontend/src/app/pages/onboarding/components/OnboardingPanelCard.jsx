import styles from './OnboardingPanelCard.module.css';

export default function OnboardingPanelCard({
  className = '',
  eyebrow,
  title,
  meta,
  description,
  children,
  footerLabel,
  footerValue,
}) {
  return (
    <div className={`${styles['onboarding-form-panel']} ${className}`.trim()}>
      <div className={styles['welcome-lang-panel-shell']}>
        <div className={styles['welcome-lang-header']}>
          <div>
            {eyebrow ? <span className={styles['welcome-lang-eyebrow']}>{eyebrow}</span> : null}
            <h3>{title}</h3>
          </div>
          {meta}
        </div>
        {description ? <p>{description}</p> : null}
      </div>

      <div className={styles['welcome-lang-panel-body']}>{children}</div>

      {(footerLabel || footerValue) ? (
        <div className={styles['welcome-lang-panel-footer']}>
          <span className={styles['welcome-lang-footer-label']}>{footerLabel}</span>
          <strong>{footerValue}</strong>
        </div>
      ) : null}
    </div>
  );
}
