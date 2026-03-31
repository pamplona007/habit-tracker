import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHouseholds } from '../../hooks';
import styles from './styles.module.scss';

const navItems = [
  { path: '/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard' as const },
  { path: '/tasks', icon: 'task_alt', labelKey: 'nav.tasks' as const },
  { path: '/notices', icon: 'campaign', labelKey: 'nav.notices' as const },
  { path: '/shopping', icon: 'shopping_cart', labelKey: 'nav.shopping' as const },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: households } = useHouseholds();

  const currentHousehold = Array.isArray(households)
    ? households.find((h) => h.id === user?.currentHouseholdId)
    : undefined;

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoText}>{t('common.appName')}</span>
          </div>
          {currentHousehold && (
            <div className={styles.householdBadge}>
              <span className="material-symbols-outlined">home</span>
              <span className={styles.householdName}>{currentHousehold.name}</span>
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
