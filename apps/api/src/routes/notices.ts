import { Hono } from 'hono'
import { prisma } from '../db'
import { z } from 'zod'

export const noticesRoutes = new Hono()

const noticeSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// List all notices
noticesRoutes.get('/', async (c) => {
  const user = c.get('user')
  
  const notices = await prisma.notice.findMany({
    where: { userId: user.id },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })

  return c.json({ notices })
})

// Create notice
noticesRoutes.post('/', async (c) => {
  const user = c.get('user')
  const data = await c.req.json()
  
  const parsed = noticeSchema.parse(data)

  const notice = await prisma.notice.create({
    data: {
      ...parsed,
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      userId: user.id,
    },
  })

  return c.json({ notice }, 201)
})

// Update notice
noticesRoutes.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const data = await c.req.json()

  const notice = await prisma.notice.findFirst({
    where: { id, userId: user.id },
  })

  if (!notice) {
    return c.json({ error: 'Notice not found' }, 404)
  }

  const updated = await prisma.notice.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : notice.startDate,
      endDate: data.endDate ? new Date(data.endDate) : notice.endDate,
    },
  })

  return c.json({ notice: updated })
})

// Delete notice
noticesRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const notice = await prisma.notice.findFirst({
    where: { id, userId: user.id },
  })

  if (!notice) {
    return c.json({ error: 'Notice not found' }, 404)
  }

  await prisma.notice.delete({ where: { id } })

  return c.json({ success: true })
})
