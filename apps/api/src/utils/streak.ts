import { prisma } from '../db'

function toDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function recalculateStreak(householdId: string): Promise<void> {
  const tasks = await prisma.task.findMany({
    where: { householdId },
    select: { id: true },
  })

  const taskIds = tasks.map((t) => t.id)

  const completions = await prisma.taskCompletion.findMany({
    where: { taskId: { in: taskIds } },
    select: { completedAt: true },
  })

  if (completions.length === 0) {
    await prisma.household.update({
      where: { id: householdId },
      data: { streak: 0, longestStreak: 0, lastCompletedDate: null },
    })
    return
  }

  const uniqueDates = [...new Set(
    completions.map((c) => toDateString(new Date(c.completedAt)))
  )].sort((a, b) => b.localeCompare(a))

  const today = toDateString(new Date())
  const yesterday = toDateString(new Date(Date.now() - 86400000))


  let longestStreak = 0
  let tempStreak = 1
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const curr = new Date(uniqueDates[i])
    const next = new Date(uniqueDates[i + 1])
    const diffDays = Math.round((curr.getTime() - next.getTime()) / 86400000)
    if (diffDays === 1) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak)


  let currentStreak = 0
  const mostRecent = uniqueDates[0]
  if (mostRecent === today || mostRecent === yesterday) {
    currentStreak = 1
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const curr = new Date(uniqueDates[i])
      const next = new Date(uniqueDates[i + 1])
      const diffDays = Math.round((curr.getTime() - next.getTime()) / 86400000)
      if (diffDays === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }

  await prisma.household.update({
    where: { id: householdId },
    data: {
      streak: currentStreak,
      longestStreak,
      lastCompletedDate: new Date(uniqueDates[0]),
    },
  })
}
