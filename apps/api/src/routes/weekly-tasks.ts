import { Hono } from 'hono'
import { prisma } from '../db'
import { z } from 'zod'

export const weeklyTasksRoutes = new Hono()

const weeklyTaskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dayOfWeek: z.number().min(0).max(6),
  isActive: z.boolean().default(true),
})

// List all weekly tasks
weeklyTasksRoutes.get('/', async (c) => {
  const user = c.get('user')

  const tasks = await prisma.weeklyTask.findMany({
    where: { userId: user.id },
    orderBy: { dayOfWeek: 'asc' },
  })

  return c.json({ tasks })
})

// Create weekly task
weeklyTasksRoutes.post('/', async (c) => {
  const user = c.get('user')
  const data = await c.req.json()

  const parsed = weeklyTaskSchema.parse(data)

  const task = await prisma.weeklyTask.create({
    data: {
      ...parsed,
      userId: user.id,
    },
  })

  return c.json({ task }, 201)
})

// Complete weekly task (toggle)
weeklyTasksRoutes.post('/:id/complete', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const task = await prisma.weeklyTask.findFirst({
    where: { id, userId: user.id },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const updated = await prisma.weeklyTask.update({
    where: { id },
    data: {
      completedAt: task.completedAt ? null : new Date(),
    },
  })

  return c.json({ task: updated })
})

// Update weekly task
weeklyTasksRoutes.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const data = await c.req.json()

  const task = await prisma.weeklyTask.findFirst({
    where: { id, userId: user.id },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const updated = await prisma.weeklyTask.update({
    where: { id },
    data,
  })

  return c.json({ task: updated })
})

// Delete weekly task
weeklyTasksRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const task = await prisma.weeklyTask.findFirst({
    where: { id, userId: user.id },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  await prisma.weeklyTask.delete({ where: { id } })

  return c.json({ success: true })
})
