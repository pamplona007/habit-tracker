import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
      <p className={styles.message}>{message || t('common.loading')}</p>
    </div>
  );
}