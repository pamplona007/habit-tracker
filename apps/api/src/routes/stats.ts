import { Hono } from 'hono'
import { prisma } from '../db'

export const statsRoutes = new Hono()

statsRoutes.get('/', async (c) => {
  const [householdCount, completionCount, bestStreak] = await Promise.all([
    prisma.household.count(),
    prisma.taskCompletion.count(),
    prisma.household.aggregate({ _max: { longestStreak: true } }),
  ])

  return c.json({
    households: householdCount,
    tasksCompleted: completionCount,
    bestStreak: bestStreak._max.longestStreak ?? 0,
  })
})
