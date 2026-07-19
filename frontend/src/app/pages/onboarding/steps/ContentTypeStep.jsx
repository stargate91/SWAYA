import { Clapperboard, Flame, Layers } from '@/ui/icons';
import OnboardingInfoCard from '../components/OnboardingInfoCard';
import OnboardingOrbitHero from '../components/OnboardingOrbitHero';
import OnboardingPanelCard from '../components/OnboardingPanelCard';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './ContentTypeStep.module.css';

export default function ContentTypeStep({
  contentTypeChoice,
  setContentTypeChoice,
}) {
  const { t } = useTranslation();

  const options = [
    {
      id: 'sfw',
      icon: Clapperboard,
      title: t('onboarding.contentType.sfwTitle', { defaultValue: 'SFW Content' }),
      desc: t('onboarding.contentType.sfwDesc', { defaultValue: 'Configure TMDB and OMDb metadata for general movies and TV shows.' }),
    },
    {
      id: 'nsfw',
      icon: Flame,
      title: t('onboarding.contentType.nsfwTitle', { defaultValue: 'NSFW Only' }),
      desc: t('onboarding.contentType.nsfwDesc', { defaultValue: 'Configure StashDB, FansDB, and PornDB for adult content search and scraping.' }),
    },
    {
      id: 'hybrid',
      icon: Layers,
      title: t('onboarding.contentType.hybridTitle', { defaultValue: 'Hybrid' }),
      desc: t('onboarding.contentType.hybridDesc', { defaultValue: 'Set up all metadata providers for both general and adult content.' }),
    },
  ];

  const activeOption = options.find(opt => opt.id === contentTypeChoice) || options[0];

  return (
    <div className="onboarding-split-layout">
      <OnboardingInfoCard
        visual={(
          <OnboardingOrbitHero
            icon={Layers}
            chips={[
              { label: 'SFW Vibe', position: 'top-right' },
              { label: 'After Dark', position: 'bottom-left' },
              { label: 'Best of Both', position: 'top-left' },
            ]}
          />
        )}
        kicker={t('onboarding.contentType.kicker', { defaultValue: 'Library Mode' })}
        title={t('onboarding.contentType.heroTitle', { defaultValue: 'Choose your content focus.' })}
        description={t('onboarding.contentType.heroDesc', { defaultValue: 'Select the type of library you want to build. This adjusts the scraper keys required.' })}
        items={[
          {
            icon: Layers,
            title: t('onboarding.contentType.stepTitle', { defaultValue: 'Tailored Experience' }),
            description: t('onboarding.contentType.stepDesc', { defaultValue: 'We only ask for API keys you actually need based on this choice.' }),
          },
        ]}
      />

      <OnboardingPanelCard
        className="onboarding-content-type-panel"
        eyebrow={t('onboarding.contentType.eyebrow', { defaultValue: 'Library Focus' })}
        title={t('onboarding.contentType.title', { defaultValue: 'What content will you organize?' })}
        meta={<div className="welcome-lang-pill">{activeOption.title}</div>}
        description={t('onboarding.contentType.description', { defaultValue: 'Choose the focus of your workspace library.' })}
        footerLabel={t('onboarding.contentType.footerLabel', { defaultValue: 'Selected mode' })}
        footerValue={activeOption.title}
      >
        <div className={styles['onboarding-content-type-step']}>
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = contentTypeChoice === opt.id;
            return (
              /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
              <div
                key={opt.id}
                className={`${styles['onboarding-type-card']} ${isSelected ? styles['is-selected'] : ''}`}
                onClick={() => setContentTypeChoice(opt.id)}
              >
                <div className={styles['type-icon-wrapper']}>
                  <Icon size={24} />
                </div>
                <div className={styles['card-text-content']}>
                  <h3>{opt.title}</h3>
                  <p>{opt.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </OnboardingPanelCard>
    </div>
  );
}
