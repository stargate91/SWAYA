import { NavLink } from 'react-router-dom';
import { CircleHelp, Power, ChevronLeft, ChevronRight } from '@/ui/icons';
import { useNavigationStateStore } from '@/stores/useNavigationStateStore';
import UtilityButton from '../ui/UtilityButton';
import Tooltip from '../ui/Tooltip';
import { useSidebar } from './useSidebar';
import styles from './Sidebar.module.css';

export default function Sidebar({ isCollapsed, onToggle }) {
  const { t, navItems, toggleAriaLabel, quitApp } = useSidebar(isCollapsed);

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles['is-collapsed'] : ''}`}>
      <div className={styles['toggle-row']}>
        <Tooltip content={isCollapsed ? t('sidebar.expand') || 'Expand' : t('sidebar.collapse') || 'Collapse'} side="right">
          <UtilityButton
            type="button"
            className={styles.toggle}
            size="sm"
            aria-label={toggleAriaLabel}
            onClick={onToggle}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </UtilityButton>
        </Tooltip>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = t(item.translationKey);
          const handleNavClick = () => {
            if (window.location.pathname === item.to) {
              useNavigationStateStore.getState().clearPageState(item.to);
              const container = document.querySelector('.shell__content') || document.querySelector('.media-detail-page__container');
              if (container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }
          };
          const linkContent = (
            <NavLink
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }) => `${styles['nav-link']} ${isActive ? styles['is-active'] : ''}`}
            >
              <Icon size={18} />
              <span className={styles['nav-link-label']}>{label}</span>
            </NavLink>
          );

          return isCollapsed ? (
            <Tooltip key={item.to} content={label} side="right">
              {linkContent}
            </Tooltip>
          ) : (
            <div key={item.to}>{linkContent}</div>
          );
        })}
      </nav>
      <div className={styles.footer}>
        {(() => {
          const handleAboutClick = () => {
            if (window.location.pathname === '/about') {
              useNavigationStateStore.getState().clearPageState('/about');
              const container = document.querySelector('.shell__content') || document.querySelector('.media-detail-page__container');
              if (container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }
          };
          return isCollapsed ? (
            <Tooltip content={t('sidebar.about') || 'About'} side="right">
              <NavLink
                to="/about"
                onClick={handleAboutClick}
                className={({ isActive }) => `${styles['nav-link']} ${styles['nav-link-footer']} ${isActive ? styles['is-active'] : ''}`}
              >
                <CircleHelp size={18} />
                <span className={styles['nav-link-label']}>{t('sidebar.about') || 'About'}</span>
              </NavLink>
            </Tooltip>
          ) : (
            <NavLink
              to="/about"
              onClick={handleAboutClick}
              className={({ isActive }) => `${styles['nav-link']} ${styles['nav-link-footer']} ${isActive ? styles['is-active'] : ''}`}
            >
              <CircleHelp size={18} />
              <span className={styles['nav-link-label']}>{t('sidebar.about') || 'About'}</span>
            </NavLink>
          );
        })()}
        {isCollapsed ? (
          <Tooltip content={t('sidebar.quit')} side="right">
            <button
              type="button"
              className={`${styles['nav-link']} ${styles['nav-link-footer']} ${styles['nav-link-danger']}`}
              onClick={quitApp}
            >
              <Power size={18} />
              <span className={styles['nav-link-label']}>{t('sidebar.quit')}</span>
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            className={`${styles['nav-link']} ${styles['nav-link-footer']} ${styles['nav-link-danger']}`}
            onClick={quitApp}
          >
            <Power size={18} />
            <span className={styles['nav-link-label']}>{t('sidebar.quit')}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
