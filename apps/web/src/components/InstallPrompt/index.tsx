import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from './useInstallPrompt';
import styles from './styles.module.scss';

export function InstallPrompt() {
  const { t } = useTranslation();
  const { isInstallable, promptInstall, dismiss } = useInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label={t('install.title')}>
      <span className={`material-symbols-outlined ${styles.icon}`}>download</span>
      <div className={styles.text}>
        <span className={styles.title}>{t('install.title')}</span>
        <span className={styles.subtitle}>{t('install.subtitle')}</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.dismissBtn} onClick={dismiss}>
          {t('install.notNow')}
        </button>
        <button className={styles.installBtn} onClick={promptInstall}>
          {t('install.install')}
        </button>
      </div>
    </div>
  );
}