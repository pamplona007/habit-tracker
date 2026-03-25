import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../../types';
import { TIMER_OPTIONS, type TimerDuration } from '../../utils/tasks';
import { Button } from '../Button';
import styles from './styles.module.css';

interface QuickStartModalProps {
  task: Task;
  onClose: () => void;
  onRollAgain?: (task: Task) => void;
}

export function QuickStartModal({ task, onClose, onRollAgain }: QuickStartModalProps) {
  const navigate = useNavigate();
  const [selectedDuration, setSelectedDuration] = useState<TimerDuration>(25);

  const handleStart = () => {
    navigate(`/timer/${task.id}`, { state: { duration: selectedDuration, task } });
  };

  const handleRollAgain = () => {
    if (onRollAgain) {
      onRollAgain(task);
    }
  };

  const getTaskTypeLabel = () => {
    switch (task.type) {
      case 'DAILY':
        return 'Daily';
      case 'WEEKLY':
        return 'Weekly';
      case 'MONTHLY':
        return 'Monthly';
      case 'ONE_TIME':
        return 'One Time';
      default:
        return 'Task';
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Decorative Blurs */}
        <div className={styles.blurTopLeft} />
        <div className={styles.blurBottomRight} />

        {/* Close Button */}
        <button className={styles.closeBtn} onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Icon Header */}
        <div className={styles.iconWrapper}>
          <div className={styles.iconBg}>
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div className={styles.iconGlow} />
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p className={styles.label}>Focus Recommendation</p>
          <h2 className={styles.taskName}>{task.name}</h2>
          <div className={styles.badges}>
            <span className={styles.durationBadge}>{selectedDuration} MINS</span>
            <span className={styles.priorityBadge}>{getTaskTypeLabel()}</span>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className={styles.description}>
            {task.description}
          </p>
        )}

        {/* Duration Selector */}
        <div className={styles.durationSection}>
          <span className={styles.sectionLabel}>Select duration</span>
          <div className={styles.durationOptions}>
            {TIMER_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`${styles.durationOption} ${selectedDuration === option.value ? styles.selected : ''}`}
                onClick={() => setSelectedDuration(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="primary" size="lg" fullWidth onClick={handleStart}>
            Start Now
          </Button>
          {onRollAgain && (
            <Button variant="outline" size="lg" fullWidth iconLeft={<span className="material-symbols-outlined">refresh</span>} onClick={handleRollAgain}>
              Roll Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}