import { TimerWidget } from '../TimerWidget';
import styles from './styles.module.scss';

export function TopBar() {
  return (
    <header className={styles.topBar}>
      <TimerWidget />
    </header>
  );
}
