import type { Task } from '../types';

export interface Streak {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
}

export function calculateStreak(tasks: Task[]): Streak {
  // Get all completions by the current user, sorted by date descending
  const allCompletions = tasks
    .flatMap((task) =>
      task.completions.map((c) => ({
        date: new Date(c.completedAt),
        userId: c.userId,
      }))
    )
    .filter((c) => c.date) // Filter out invalid dates
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  if (allCompletions.length === 0) {
    return { current: 0, longest: 0, lastCompletedDate: null };
  }

  // Get unique dates (day only, no time)
  const uniqueDates = [...new Set(allCompletions.map((c) => c.date.toISOString().split('T')[0]))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate current streak (must include today or yesterday to be "current")
  if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    for (let i = 0; i < uniqueDates.length; i++) {
      const expectedDate = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      if (uniqueDates[i] === expectedDate) {
        tempStreak++;
      } else {
        break;
      }
    }
    currentStreak = tempStreak;
  }

  // Calculate longest streak
  tempStreak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = (prevDate.getTime() - currDate.getTime()) / 86400000;

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    current: currentStreak,
    longest: longestStreak,
    lastCompletedDate: uniqueDates[0] || null,
  };
}
