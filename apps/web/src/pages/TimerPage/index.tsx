import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import type { Task } from '../../types';
import styles from './styles.module.css';

interface LocationState {
  duration: number;
  task: Task;
}

export function TimerPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tasks } = useTasks(user?.currentHouseholdId || '');
  const state = location.state as LocationState;

  const [timeLeft, setTimeLeft] = useState(state?.duration ? state.duration * 60 : 25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalTime, setTotalTime] = useState(state?.duration ? state.duration * 60 : 25 * 60);

  const task = tasks?.find((t) => t.id === taskId) || state?.task;

  const handleComplete = useCallback(async () => {
    if (!taskId || !user?.currentHouseholdId) return;

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/households/${user.currentHouseholdId}/tasks/${taskId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ type: 'FULL' }),
        }
      );
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  }, [taskId, user]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsCompleted(true);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, handleComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const handleBack = () => {
    navigate(-1);
  };

  if (!task) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <span className="material-symbols-outlined">error</span>
          <p>Task not found</p>
          <button onClick={() => navigate('/dashboard')} className={styles.errorBtn}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button onClick={handleBack} className={styles.backBtn}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className={styles.label}>Focus Mode</span>
        <div className={styles.placeholder} />
      </header>

      <div className={styles.content}>
        <div className={styles.taskInfo}>
          <div className={styles.taskIcon}>
            <span className="material-symbols-outlined">task_alt</span>
          </div>
          <h1 className={styles.taskName}>{task.name}</h1>
          {task.description && <p className={styles.taskDesc}>{task.description}</p>}
        </div>

        <div className={styles.timerContainer}>
          <svg className={styles.progressRing} viewBox="0 0 200 200">
            <circle
              className={styles.progressBg}
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="8"
            />
            <circle
              className={styles.progressFill}
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className={styles.timerDisplay}>
            <span className={styles.timerValue}>{formatTime(timeLeft)}</span>
            <span className={styles.timerLabel}>
              {isCompleted ? 'Completed!' : isRunning ? 'Focusing...' : 'Ready'}
            </span>
          </div>
        </div>

        {!isCompleted && (
          <div className={styles.controls}>
            {!isRunning ? (
              <button
                className={styles.primaryBtn}
                onClick={() => setIsRunning(true)}
              >
                <span className="material-symbols-outlined">play_arrow</span>
                Start
              </button>
            ) : (
              <button
                className={styles.secondaryBtn}
                onClick={() => setIsRunning(false)}
              >
                <span className="material-symbols-outlined">pause</span>
                Pause
              </button>
            )}
          </div>
        )}

        {isCompleted && (
          <div className={styles.completed}>
            <div className={styles.completedIcon}>
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <h2 className={styles.completedTitle}>Great work!</h2>
            <p className={styles.completedText}>
              You completed {task.name}. Keep up the momentum!
            </p>
            <button
              className={styles.primaryBtn}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        )}

        <button
          className={styles.skipBtn}
          onClick={() => navigate('/dashboard')}
        >
          Skip Timer
        </button>
      </div>
    </div>
  );
}
