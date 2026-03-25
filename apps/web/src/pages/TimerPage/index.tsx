import { useTimer } from '../../context/TimerContext';
import { useCompleteTask } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import styles from './styles.module.css';

const FOCUS_QUOTES = [
  "Focus is a matter of deciding what things you're not going to do.",
  "The successful warrior is the average man, with laser-like focus.",
  "Concentrate all your thoughts upon the work in hand.",
  "It is during our darkest moments that we must focus to see the light.",
];

export function TimerPage() {
  const { user } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const completeTask = useCompleteTask();
  const {
    task,
    duration,
    timeLeft,
    isRunning,
    isCompleted,
    isMinimized,
    minimizeTimer,
    pauseTimer,
    resumeTimer,
    requestReset,
    completeTimer,
    resetTimer
  } = useTimer();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;
  const quote = task ? FOCUS_QUOTES[task.id.charCodeAt(0) % FOCUS_QUOTES.length] : FOCUS_QUOTES[0];

  const handleMinimize = () => {
    minimizeTimer();
  };

  const handleStop = () => {
    if (isRunning && timeLeft > 0) {
      requestReset();
    } else {
      pauseTimer();
    }
  };

  const handleComplete = async () => {
    if (task && householdId) {
      try {
        await completeTask.mutateAsync({ householdId, taskId: task.id, type: 'FULL' });
        completeTimer();
      } catch (error) {
        console.error('Failed to complete task:', error);
      }
    }
  };

  if (!task || isMinimized) {
    return null;
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.minimizeBtn} onClick={handleMinimize}>
          <span className="material-symbols-outlined">keyboard_arrow_down</span>
        </button>
        <span className={styles.focusBadge}>Focus Mode</span>
        <div className={styles.headerSpacer} />
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Task Identity Card */}
        <div className={styles.taskCard}>
          <h1 className={styles.taskName}>{task.name}</h1>
          {task.description && (
            <p className={styles.taskDesc}>{task.description}</p>
          )}
        </div>

        {/* Timer Display */}
        <div className={styles.timerWrapper}>
          <div className={styles.timerHalo} />
          <svg className={styles.progressRing} viewBox="0 0 200 200">
            <circle
              className={styles.progressBg}
              cx="100"
              cy="100"
              r="96"
              fill="none"
              strokeWidth="4"
            />
            <circle
              className={styles.progressFill}
              cx="100"
              cy="100"
              r="96"
              fill="none"
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 96}
              strokeDashoffset={2 * Math.PI * 96 * (1 - progress / 100)}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className={styles.timerContent}>
            <span className={styles.timerValue}>{formatTime(timeLeft)}</span>
            <span className={styles.timerLabel}>
              {isCompleted ? 'Completed!' : isRunning ? 'Focusing' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        {!isCompleted && (
          <div className={styles.controls}>
            <button
              className={styles.secondaryBtn}
              onClick={handleStop}
              title="Stop session"
            >
              <span className="material-symbols-outlined">stop</span>
            </button>

            <button
              className={styles.primaryBtn}
              onClick={() => isRunning ? pauseTimer() : resumeTimer()}
              title={isRunning ? 'Pause' : 'Resume'}
            >
              <span className="material-symbols-outlined">
                {isRunning ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={handleMinimize}
              title="Minimize to widget"
            >
              <span className="material-symbols-outlined">minimize</span>
            </button>
          </div>
        )}

        {/* Completion / Navigation Actions */}
        {isCompleted ? (
          <div className={styles.completedState}>
            <div className={styles.completedIcon}>
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <h2 className={styles.completedTitle}>Great work!</h2>
            <p className={styles.completedText}>
              You completed {task.name}. Keep up the momentum!
            </p>
            <button className={styles.primaryActionBtn} onClick={resetTimer}>
              Done
            </button>
          </div>
        ) : (
          <button className={styles.secondaryActionBtn} onClick={handleComplete}>
            <span className="material-symbols-outlined">check</span>
            Mark as Completed
          </button>
        )}

        {/* Distraction Quote */}
        {!isCompleted && (
          <div className={styles.quote}>
            <p>"{quote}"</p>
          </div>
        )}
      </main>
    </div>
  );
}
