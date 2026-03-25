import type { Task } from '../types';

export function getRandomPendingTask(tasks: Task[]): Task | null {
  const pending = tasks.filter((t) => !t.userCompleted);
  if (pending.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * pending.length);
  return pending[randomIndex];
}

export type TimerDuration = 15 | 25 | 45 | 60;

export const TIMER_OPTIONS: { value: TimerDuration; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 25, label: '25 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
];
