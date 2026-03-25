import { useTimer } from '../../context/TimerContext';
import styles from './styles.module.css';

export function TimerWidget() {
  const {
    isActive,
    isMinimized,
    task,
    duration,
    timeLeft,
    isRunning,
    isCompleted,
    expandTimer,
    pauseTimer,
    resumeTimer,
    requestReset,
    resetTimer,
  } = useTimer();

  if (!isActive || !task || !isMinimized) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  const handleExpand = () => {
    expandTimer();
  };

  const handleStopClick = () => {
    if (isRunning && timeLeft > 0) {
      requestReset();
    } else {
      resetTimer();
    }
  };

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <div className={styles.widget}>
      {isCompleted ? (
        <div className={styles.completed}>
          <div className={styles.completedIcon}>
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <span className={styles.completedText}>Session Complete!</span>
          <button className={styles.doneBtn} onClick={resetTimer}>
            Done
          </button>
        </div>
      ) : (
        <>
          <button className={styles.expandBtn} onClick={handleExpand}>
            <span className="material-symbols-outlined">open_in_full</span>
          </button>

          <span className={styles.taskName}>{task.name}</span>

          <div className={styles.timer}>
            <svg className={styles.progressRing} viewBox="0 0 24 24">
              <circle
                className={styles.progressBg}
                cx="12"
                cy="12"
                r={radius}
                strokeWidth="2"
              />
              <circle
                className={styles.progressFill}
                cx="12"
                cy="12"
                r={radius}
                strokeWidth="2"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 12 12)"
              />
            </svg>
            <span className={styles.time}>{formatTime(timeLeft)}</span>
          </div>

          <div className={styles.controls}>
            <button
              className={styles.controlBtn}
              onClick={isRunning ? pauseTimer : resumeTimer}
            >
              <span className="material-symbols-outlined">
                {isRunning ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button className={styles.controlBtn} onClick={handleStopClick}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}