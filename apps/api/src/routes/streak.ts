import { Hono } from 'hono'
import { prisma } from '../db'
import type { AppBindings } from '../types'

export const streakRoutes = new Hono<AppBindings>()

streakRoutes.get('/', async (c) => {
  const householdId = c.get('householdId')

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { streak: true, longestStreak: true, lastCompletedDate: true },
  })

  if (!household) {
    return c.json({ error: 'Household not found' }, 404)
  }

  return c.json({
    streak: {
      current: household.streak,
      longest: household.longestStreak,
      lastCompletedDate: household.lastCompletedDate?.toISOString().split('T')[0] ?? null,
    },
  })
})
