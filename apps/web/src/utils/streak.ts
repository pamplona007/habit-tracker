import type { DayRecord, Goals } from '../types'
import { getWeekStart, getDaysInRange } from './dates'

function subtractDay(date: string): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isWeekComplete(weekStart: string, today: string): boolean {
  const weekEnd = getWeekEnd(weekStart)
  return weekEnd < today
}

function countActiveDaysInWeek(
  weekStart: string,
  recordMap: Map<string, DayRecord>,
  today: string
): number {
  const weekEnd = getWeekEnd(weekStart)
  const endDate = weekEnd < today ? weekEnd : today
  const days = getDaysInRange(weekStart, endDate)
  return days.filter((d) => {
    const rec = recordMap.get(d)
    return rec !== undefined && rec.completedTaskIds.length > 0
  }).length
}

export function calculateStreak(
  dayRecords: DayRecord[],
  goals: Goals,
  todayDate: string
): number {
  const recordMap = new Map<string, DayRecord>()
  for (const rec of dayRecords) {
    recordMap.set(rec.date, rec)
  }

  // Track which weeks have been evaluated to avoid re-checking
  const weekMetGoal = new Map<string, boolean>()

  function weekMeetGoal(weekStart: string): boolean {
    if (weekMetGoal.has(weekStart)) return weekMetGoal.get(weekStart)!
    const count = countActiveDaysInWeek(weekStart, recordMap, todayDate)
    const met = count >= goals.weeklyMinDays
    weekMetGoal.set(weekStart, met)
    return met
  }

  let streak = 0
  let current = todayDate

  while (true) {
    const rec = recordMap.get(current)
    const isActive = rec !== undefined && rec.completedTaskIds.length > 0
    const weekStart = getWeekStart(current)
    const weekDone = isWeekComplete(weekStart, todayDate)

    if (isActive) {
      streak++
      current = subtractDay(current)
      continue
    }

    // Day is not active. Check if the week still met goal
    if (weekDone && weekMeetGoal(weekStart)) {
      // Week met goal even though this day wasn't active — streak continues
      streak++
      current = subtractDay(current)
      continue
    }

    // If the week is not yet complete (ongoing week), we allow the day to pass
    // without breaking the streak since the week isn't over
    if (!weekDone) {
      // Don't count inactive days in the current week but don't break yet
      // Only go back if there's still hope (week isn't failed yet)
      // Stop extending streak for this week's inactive days
      break
    }

    // Week ended and didn't meet goal, streak breaks
    break
  }

  return streak
}
