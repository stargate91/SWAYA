import { Check } from '@/ui/icons';
import { useSettingsViewContext, useSettingsField } from '../SettingsFormContext.jsx';
import Card from '@/ui/Card';
import SelectableCard from '@/ui/SelectableCard';
import styles from './ThemeTab.module.css';
import Inline from '@/ui/Inline';

const THEME_LIST = [
  { value: 'dark', translationKey: 'settingsPage.sections.theme.options.dark' },
  { value: 'swaya-legacy', translationKey: 'settingsPage.sections.theme.options.swayaLegacy' },
  { value: 'tokyo-night', translationKey: 'settingsPage.sections.theme.options.tokyoNight' },
  { value: 'dracula', translationKey: 'settingsPage.sections.theme.options.dracula' },
  { value: 'gruvbox-dark', translationKey: 'settingsPage.sections.theme.options.gruvboxDark' },
  { value: 'nord', translationKey: 'settingsPage.sections.theme.options.nord' },
  { value: 'rose-pine', translationKey: 'settingsPage.sections.theme.options.rosePine' },
  { value: 'premium-carbon', translationKey: 'settingsPage.sections.theme.options.premiumCarbon' },
  { value: 'amoled-modern', translationKey: 'settingsPage.sections.theme.options.amoledModern' },
  { value: 'pine-forest', translationKey: 'settingsPage.sections.theme.options.pineForest' },
  { value: 'classic-dark', translationKey: 'settingsPage.sections.theme.options.classicDark' },
  { value: 'bladerunner-la', translationKey: 'settingsPage.sections.theme.options.bladerunnerLA' },
  { value: 'bladerunner-2049', translationKey: 'settingsPage.sections.theme.options.bladerunner2049' },
  { value: 'cyberpunk-dark', translationKey: 'settingsPage.sections.theme.options.cyberpunkDark' },
  { value: 'matrix-code', translationKey: 'settingsPage.sections.theme.options.matrixCode' },
  { value: 'synthwave-outrun', translationKey: 'settingsPage.sections.theme.options.synthwaveOutrun' },
  { value: 'alien-nostromo', translationKey: 'settingsPage.sections.theme.options.alienNostromo' },
  { value: 'cyberdyne-steel', translationKey: 'settingsPage.sections.theme.options.cyberdyneSteel' },
  { value: 'cyber-renaissance', translationKey: 'settingsPage.sections.theme.options.cyberRenaissance' },
  { value: 'eva-unit-01', translationKey: 'settingsPage.sections.theme.options.evaUnit01' },
  { value: 'lcars-console', translationKey: 'settingsPage.sections.theme.options.lcarsConsole' },
  { value: 'cyber-stealth', translationKey: 'settingsPage.sections.theme.options.cyberStealth' },
  { value: 'midnight-tokyo', translationKey: 'settingsPage.sections.theme.options.midnightTokyo' },
  { value: 'vaporwave-dream', translationKey: 'settingsPage.sections.theme.options.vaporwaveDream' },
  { value: 'sakura-neon', translationKey: 'settingsPage.sections.theme.options.sakuraNeon' },
  { value: 'disco-glam', translationKey: 'settingsPage.sections.theme.options.discoGlam' },
  { value: 'midnight-amber', translationKey: 'settingsPage.sections.theme.options.midnightAmber' },
  { value: 'ruby-velvet', translationKey: 'settingsPage.sections.theme.options.rubyVelvet' },
  { value: 'solarized-dark', translationKey: 'settingsPage.sections.theme.options.solarizedDark' },
  { value: 'hot-red', translationKey: 'settingsPage.sections.theme.options.hotRed' }
];

export default function ThemeTab() {
  const { t } = useSettingsViewContext();
  const { value: currentTheme, onChange } = useSettingsField('ui_theme');

  return (
    <Card
      title={t('settingsPage.sections.theme.title')}
      eyebrow={t('settingsPage.sections.theme.eyebrow')}
    >
      <div className={styles['theme-tab-container']}>
        <div className={styles['theme-tab-header']}>
          <label className={styles['theme-tab-description']}>
            {t('settingsPage.sections.theme.hint') || 'Choose how the app should look.'}
          </label>
        </div>

        <div className={styles['theme-grid']}>
          {THEME_LIST.map((theme) => {
            const isActive = currentTheme === theme.value;
            const label = t(theme.translationKey) || theme.value;

            return (
              <SelectableCard
                key={theme.value}
                selected={isActive}
                variant="theme"
                className="theme-card"
                onClick={() => {
                  if (onChange) {
                    onChange({ target: { value: theme.value } });
                  }
                }}
              >
                <Inline align="center" justify="between" className={styles['theme-card__header']}>
                  <span className={styles['theme-card__name']}>{label}</span>
                  <div className={`${styles['theme-card__indicator']} ${isActive ? styles['theme-card__indicator--active'] : ''}`}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                </Inline>
              </SelectableCard>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
