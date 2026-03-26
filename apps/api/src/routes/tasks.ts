import { Hono } from 'hono'
import { prisma } from '../db'
import { z } from 'zod'
import type { AppBindings } from '../types'

export const tasksRoutes = new Hono<AppBindings>()

const taskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME']).default('ONE_TIME'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  deadline: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
})


tasksRoutes.get('/', async (c) => {
  const householdId = c.get('householdId')
  const type = c.req.query('type') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME' | undefined

  const where: Record<string, unknown> = { householdId }
  if (type) where.type = type

  const tasks = await prisma.task.findMany({
    where,
    include: {
      completions: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { completedAt: 'desc' },
      },
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  return c.json({ tasks })
})


tasksRoutes.post('/', async (c) => {
  const householdId = c.get('householdId')
  const data = await c.req.json()

  const parsed = taskSchema.parse(data)

  const task = await prisma.task.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      type: parsed.type,
      priority: parsed.priority,
      dayOfWeek: parsed.dayOfWeek ?? null,
      dayOfMonth: parsed.dayOfMonth ?? null,
      deadline: parsed.deadline ? new Date(parsed.deadline) : null,
      isActive: parsed.isActive,
      householdId,
    },
  })

  return c.json({ task }, 201)
})


tasksRoutes.patch('/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = await c.req.json()

  const task = await prisma.task.findFirst({
    where: { id, householdId },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : task.deadline,
    },
  })

  return c.json({ task: updated })
})


tasksRoutes.post('/:id/complete', async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const type = body.type === 'PARTIAL' ? 'PARTIAL' : 'FULL'

  const task = await prisma.task.findFirst({
    where: { id, householdId },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const completion = await prisma.taskCompletion.create({
    data: {
      taskId: task.id,
      userId: user.id,
      type,
    },
    include: { user: { select: { id: true, name: true } } },
  })

  return c.json({ completion }, 201)
})


tasksRoutes.delete('/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')

  const task = await prisma.task.findFirst({
    where: { id, householdId },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  await prisma.task.delete({ where: { id } })

  return c.json({ success: true })
})


tasksRoutes.delete('/:id/complete', async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user')
  const taskId = c.req.param('id')

  const task = await prisma.task.findFirst({
    where: { id: taskId, householdId },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }


  const latestCompletion = await prisma.taskCompletion.findFirst({
    where: { taskId, userId: user.id },
    orderBy: { completedAt: 'desc' },
  })

  if (!latestCompletion) {
    return c.json({ error: 'No completion to remove' }, 400)
  }

  await prisma.taskCompletion.delete({
    where: { id: latestCompletion.id },
  })

  return c.json({ success: true })
})
