import { TimerWidget } from '../TimerWidget';
import styles from './styles.module.css';

export function TopBar() {
  return (
    <header className={styles.topBar}>
      <TimerWidget />
    </header>
  );
}
