import styles from './OnboardingTimeline.module.css';

export default function OnboardingTimeline({ step, totalSteps = 7, isAnyGuideOpen }) {
  const stepNums = Array.from({ length: totalSteps }, (_, i) => i + 1);
  return (
    <div className={`${styles['onboarding-timeline']} ${isAnyGuideOpen ? styles['is-hidden'] : ''}`}>
      {stepNums.map((num) => (
        <div 
          key={num} 
          className={`${styles['timeline-dot-wrapper']} ${num <= step ? styles['is-active'] : ''} ${num === step ? styles['is-current'] : ''}`}
        >
          <div className={styles['timeline-dot']} />
          {num < totalSteps && <div className={styles['timeline-line']} />}
        </div>
      ))}
    </div>
  );
}
