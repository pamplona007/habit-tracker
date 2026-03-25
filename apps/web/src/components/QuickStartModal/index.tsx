import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../../types';
import { TIMER_OPTIONS, type TimerDuration } from '../../utils/tasks';
import { Button } from '../Button';
import { useTimer } from '../../context/TimerContext';
import styles from './styles.module.css';

interface QuickStartModalProps {
  task: Task;
  onClose: () => void;
  onRollAgain?: (task: Task) => void;
}

export function QuickStartModal({ task, onClose, onRollAgain }: QuickStartModalProps) {
  const { t } = useTranslation();
  const { startTimer } = useTimer();
  const [selectedDuration, setSelectedDuration] = useState<TimerDuration>(25);

  const handleStart = () => {
    startTimer(task, selectedDuration);
    onClose();
  };

  const handleRollAgain = () => {
    if (onRollAgain) {
      onRollAgain(task);
    }
  };

  const getTaskTypeLabel = () => {
    switch (task.type) {
      case 'DAILY':
        return t('tasks.types.DAILY');
      case 'WEEKLY':
        return t('tasks.types.WEEKLY');
      case 'MONTHLY':
        return t('tasks.types.MONTHLY');
      case 'ONE_TIME':
        return t('tasks.types.ONE_TIME');
      default:
        return t('tasks.title');
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
          <p className={styles.label}>{t('quickStart.focusRecommendation')}</p>
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
          <span className={styles.sectionLabel}>{t('quickStart.selectDuration')}</span>
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
            {t('quickStart.startNow')}
          </Button>
          {onRollAgain && (
            <Button variant="outline" size="lg" fullWidth iconLeft={<span className="material-symbols-outlined">refresh</span>} onClick={handleRollAgain}>
              {t('quickStart.rollAgain')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}