import { useTimer } from '../../context/TimerContext';
import { Button } from '../Button';
import styles from './styles.module.scss';

export function StopTimerConfirm() {
  const { showStopConfirm, task, cancelReset, confirmReset } = useTimer();

  if (!showStopConfirm || !task) return null;

  return (
    <div className={styles.overlay} onClick={cancelReset}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIcon}>
          <span className="material-symbols-outlined">warning</span>
        </div>
        <h3 className={styles.modalTitle}>Stop Timer?</h3>
        <p className={styles.modalText}>
          Your progress on <strong>{task.name}</strong> will not be saved.
        </p>
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={cancelReset}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmReset}>
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
}