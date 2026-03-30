import { Hono } from 'hono'
import { prisma } from '../db'
import { z } from 'zod'
import type { AppBindings } from '../types'

export const noticesRoutes = new Hono<AppBindings>()

const noticeSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

const noticeUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
})


noticesRoutes.get('/', async (c) => {
  const householdId = c.get('householdId')

  const notices = await prisma.notice.findMany({
    where: { householdId },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })

  return c.json({ notices })
})


noticesRoutes.post('/', async (c) => {
  const householdId = c.get('householdId')
  const data = await c.req.json()

  const parsed = noticeSchema.parse(data)

  const notice = await prisma.notice.create({
    data: {
      title: parsed.title,
      content: parsed.content,
      priority: parsed.priority,
      isActive: parsed.isActive,
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      householdId,
    },
  })

  return c.json({ notice }, 201)
})


noticesRoutes.patch('/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = await c.req.json()

  const parsed = noticeUpdateSchema.parse(data)

  const notice = await prisma.notice.findFirst({
    where: { id, householdId },
  })

  if (!notice) {
    return c.json({ error: 'Notice not found' }, 404)
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.title !== undefined) updateData.title = parsed.title
  if (parsed.content !== undefined) updateData.content = parsed.content
  if (parsed.priority !== undefined) updateData.priority = parsed.priority
  if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive
  if (parsed.startDate !== undefined) updateData.startDate = parsed.startDate ? new Date(parsed.startDate) : null
  if (parsed.endDate !== undefined) updateData.endDate = parsed.endDate ? new Date(parsed.endDate) : null

  const updated = await prisma.notice.update({
    where: { id },
    data: updateData,
  })

  return c.json({ notice: updated })
})


noticesRoutes.delete('/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')

  const notice = await prisma.notice.findFirst({
    where: { id, householdId },
  })

  if (!notice) {
    return c.json({ error: 'Notice not found' }, 404)
  }

  await prisma.notice.delete({ where: { id } })

  return c.json({ success: true })
})
