import styles from './OnboardingTimeline.module.css';

export default function OnboardingTimeline({ step, isAnyGuideOpen }) {
  return (
    <div className={`${styles['onboarding-timeline']} ${isAnyGuideOpen ? styles['is-hidden'] : ''}`}>
      {[1, 2, 3, 4, 5, 6, 7].map((num) => (
        <div 
          key={num} 
          className={`${styles['timeline-dot-wrapper']} ${num <= step ? styles['is-active'] : ''} ${num === step ? styles['is-current'] : ''}`}
        >
          <div className={styles['timeline-dot']} />
          {num < 7 && <div className={styles['timeline-line']} />}
        </div>
      ))}
    </div>
  );
}
