import { TimerWidget } from '../TimerWidget';
import { UserMenu } from '../UserMenu';
import styles from './styles.module.scss';

export function TopBar() {
  return (
    <header className={styles.topBar}>
      <TimerWidget />
      <UserMenu />
    </header>
  );
}