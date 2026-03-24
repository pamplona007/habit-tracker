import { Hono } from 'hono'
import { prisma } from '../db'
import { z } from 'zod'

export const monthlyTasksRoutes = new Hono()

const monthlyTaskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dayOfMonth: z.number().min(1).max(31),
  isActive: z.boolean().default(true),
})

// List all monthly tasks
monthlyTasksRoutes.get('/', async (c) => {
  const user = c.get('user')

  const tasks = await prisma.monthlyTask.findMany({
    where: { userId: user.id },
    orderBy: { dayOfMonth: 'asc' },
  })

  return c.json({ tasks })
})

// Create monthly task
monthlyTasksRoutes.post('/', async (c) => {
  const user = c.get('user')
  const data = await c.req.json()

  const parsed = monthlyTaskSchema.parse(data)

  const task = await prisma.monthlyTask.create({
    data: {
      ...parsed,
      userId: user.id,
    },
  })

  return c.json({ task }, 201)
})

// Complete monthly task (toggle)
monthlyTasksRoutes.post('/:id/complete', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const task = await prisma.monthlyTask.findFirst({
    where: { id, userId: user.id },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const updated = await prisma.monthlyTask.update({
    where: { id },
    data: {
      completedAt: task.completedAt ? null : new Date(),
    },
  })

  return c.json({ task: updated })
})

// Update monthly task
monthlyTasksRoutes.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const data = await c.req.json()

  const task = await prisma.monthlyTask.findFirst({
    where: { id, userId: user.id },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const updated = await prisma.monthlyTask.update({
    where: { id },
    data,
  })

  return c.json({ task: updated })
})

// Delete monthly task
monthlyTasksRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const task = await prisma.monthlyTask.findFirst({
    where: { id, userId: user.id },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  await prisma.monthlyTask.delete({ where: { id } })

  return c.json({ success: true })
})
