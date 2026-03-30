import { Hono } from 'hono'
import { z } from 'zod'
import { jwtMiddleware, loadUser } from '../middleware/auth'
import { prisma } from '../db'
import type { AppBindings } from '../types'

export const pushRoutes = new Hono<AppBindings>()

pushRoutes.use('/*', jwtMiddleware, loadUser)

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  deviceName: z.string().optional(),
})

pushRoutes.post('/subscribe', async (c) => {
  const userId = c.get('user').id
  const body = await c.req.json()
  const data = subscriptionSchema.parse(body)

  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    update: {
      userId,
      keys: JSON.stringify(data.keys),
      isActive: true,
      deviceName: data.deviceName,
    },
    create: {
      userId,
      endpoint: data.endpoint,
      keys: JSON.stringify(data.keys),
      deviceName: data.deviceName,
    },
  })

  return c.json({ subscription }, 201)
})

pushRoutes.delete('/subscribe/:id', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')

  const subscription = await prisma.pushSubscription.findFirst({
    where: { id, userId },
  })

  if (!subscription) {
    return c.json({ error: 'Subscription not found' }, 404)
  }

  await prisma.pushSubscription.delete({ where: { id } })
  return c.json({ success: true })
})

pushRoutes.get('/settings', async (c) => {
  const userId = c.get('user').id

  let settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  })

  if (!settings) {
    settings = await prisma.notificationSettings.create({
      data: { userId },
    })
  }

  return c.json({ settings })
})

const settingsSchema = z.object({
  morningReminderEnabled: z.boolean().optional(),
  morningReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  taskCreatedEnabled: z.boolean().optional(),
  taskCompletedEnabled: z.boolean().optional(),
})

pushRoutes.patch('/settings', async (c) => {
  const userId = c.get('user').id
  const body = await c.req.json()
  const data = settingsSchema.parse(body)

  const settings = await prisma.notificationSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  })

  return c.json({ settings })
})