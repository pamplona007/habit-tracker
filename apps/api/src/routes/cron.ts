import { Hono } from 'hono'
import { prisma } from '../db'
import { sendToUser } from '../services/notification'
import type { AppBindings } from '../types'

export const cronRoutes = new Hono<AppBindings>()

cronRoutes.get('/morning-reminders', async (c) => {
  const CRON_SECRET = process.env.CRON_SECRET
  const authHeader = c.req.header('authorization')
  if (!CRON_SECRET || authHeader !== `CRON_SECRET ${CRON_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const settings = await prisma.notificationSettings.findMany({
    where: { morningReminderEnabled: true },
    select: { userId: true },
  })

  const userIds = settings.map(s => s.userId)

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, currentHouseholdId: true },
  })

  let sent = 0
  let errors = 0

  for (const user of users) {
    if (!user.currentHouseholdId) continue

    const pendingTasks = await prisma.task.count({
      where: {
        householdId: user.currentHouseholdId,
        isActive: true,
        type: { in: ['DAILY', 'WEEKLY', 'MONTHLY'] },
        completions: {
          none: {
            completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        },
      },
    })

    if (pendingTasks === 0) continue

    const result = await sendToUser(
      user.id,
      {
        title: 'Bom dia! ☀️',
        body: `Você tem ${pendingTasks} tarefas pendentes hoje. Bora começar?`,
        url: '/tasks',
      },
      prisma
    )

    if (result.sent > 0) sent++
    else errors++
  }

  return c.json({ sent, errors })
})