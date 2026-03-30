import { Hono } from 'hono'
import { prisma } from '../db'
import { z } from 'zod'
import type { AppBindings, AuthUser } from '../types'
import { recalculateStreak } from '../utils/streak'
import { broadcastToHousehold } from '../services/notification'

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

const taskUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  deadline: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
})

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function isCompletedInPeriod(taskType: string, completedAt: Date): boolean {
  if (taskType === 'ONE_TIME') return true
  if (taskType === 'DAILY') {
    const start = startOfToday()
    return completedAt >= start
  }
  if (taskType === 'WEEKLY') {
    const start = startOfWeek()
    return completedAt >= start
  }
  if (taskType === 'MONTHLY') {
    const start = startOfMonth()
    return completedAt >= start
  }
  return false
}

function buildTaskResponse(task: Record<string, unknown>, completed: boolean, completionType: string | null): Record<string, unknown> {
  const { completions: _completions, ...rest } = task
  return { ...rest, completed, completionType }
}

tasksRoutes.get('/', async (c) => {
  const householdId = c.get('householdId')
  const type = c.req.query('type') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME' | undefined

  const where: Record<string, unknown> = { householdId, deletedAt: null }
  if (type) where.type = type

  const tasks = await prisma.task.findMany({
    where,
    include: {
      completions: {
        orderBy: { completedAt: 'desc' },
      },
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  const tasksWithCompleted = tasks.map((task) => {
    const periodCompletion = task.completions.find((c) => isCompletedInPeriod(task.type, c.completedAt))
    const completed = !!periodCompletion
    const completionType = completed ? (periodCompletion?.type ?? null) : null
    return buildTaskResponse(task as unknown as Record<string, unknown>, completed, completionType)
  })

  return c.json({ tasks: tasksWithCompleted })
})


tasksRoutes.post('/', async (c) => {
  const householdId = c.get('householdId')
  const creator = c.get('user')
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

  broadcastToHousehold(
    householdId,
    creator.id,
    { title: 'Nova tarefa', body: `Tarefa criada: ${task.name}` },
    prisma
  ).catch(console.error)

  return c.json({ task: buildTaskResponse(task as unknown as Record<string, unknown>, false, null) }, 201)
})


tasksRoutes.patch('/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = await c.req.json()

  const parsed = taskUpdateSchema.parse(data)

  const task = await prisma.task.findFirst({
    where: { id, householdId },
    include: { completions: { orderBy: { completedAt: 'desc' } } },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.name !== undefined) updateData.name = parsed.name
  if (parsed.description !== undefined) updateData.description = parsed.description
  if (parsed.type !== undefined) updateData.type = parsed.type
  if (parsed.priority !== undefined) updateData.priority = parsed.priority
  if (parsed.dayOfWeek !== undefined) updateData.dayOfWeek = parsed.dayOfWeek
  if (parsed.dayOfMonth !== undefined) updateData.dayOfMonth = parsed.dayOfMonth
  if (parsed.deadline !== undefined) updateData.deadline = parsed.deadline ? new Date(parsed.deadline) : null
  if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
  })

  const periodCompletion = task.completions.find((c) => isCompletedInPeriod(updated.type, c.completedAt))
  const completed = !!periodCompletion
  const completionType = completed ? (periodCompletion?.type ?? null) : null

  return c.json({ task: buildTaskResponse(updated as unknown as Record<string, unknown>, completed, completionType) })
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

  await recalculateStreak(householdId)

  broadcastToHousehold(
    householdId,
    user.id,
    { title: 'Tarefa concluída', body: `${user.name} completou: ${task.name}` },
    prisma
  ).catch(console.error)

  return c.json({ completion }, 201)
})


tasksRoutes.delete('/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')

  const task = await prisma.task.findFirst({
    where: { id, householdId, deletedAt: null },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return c.json({ success: true })
})


tasksRoutes.get('/archived', async (c) => {
  const householdId = c.get('householdId')

  const tasks = await prisma.task.findMany({
    where: { householdId, deletedAt: { not: null } },
    include: {
      completions: {
        orderBy: { completedAt: 'desc' },
      },
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  const tasksWithCompleted = tasks.map((task) => {
    const periodCompletion = task.completions.find((c) => isCompletedInPeriod(task.type, c.completedAt))
    const completed = !!periodCompletion
    const completionType = completed ? (periodCompletion?.type ?? null) : null
    return buildTaskResponse(task as unknown as Record<string, unknown>, completed, completionType)
  })

  return c.json({ tasks: tasksWithCompleted })
})


tasksRoutes.post('/:id/restore', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')

  const task = await prisma.task.findFirst({
    where: { id, householdId, deletedAt: { not: null } },
    include: { completions: { orderBy: { completedAt: 'desc' } } },
  })

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const restored = await prisma.task.update({
    where: { id },
    data: { deletedAt: null },
  })

  const periodCompletion = task.completions.find((c) => isCompletedInPeriod(restored.type, c.completedAt))
  const completed = !!periodCompletion
  const completionType = completed ? (periodCompletion?.type ?? null) : null

  return c.json({ task: buildTaskResponse(restored as unknown as Record<string, unknown>, completed, completionType) })
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

  await recalculateStreak(householdId)

  return c.json({ success: true })
})
