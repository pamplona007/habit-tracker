import { Hono } from 'hono'
import { prisma } from '../db'
import { z } from 'zod'
import type { AppBindings } from '../types'

export const shoppingRoutes = new Hono<AppBindings>()

const itemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().min(1).default(1),
})

// GET /households/:householdId/shopping
shoppingRoutes.get('/', async (c) => {
  const householdId = c.get('householdId')

  const lists = await prisma.shoppingList.findMany({
    where: { householdId },
    include: { items: { orderBy: { isChecked: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })

  return c.json({ lists })
})

// GET /households/:householdId/shopping/:id
shoppingRoutes.get('/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')

  const list = await prisma.shoppingList.findFirst({
    where: { id, householdId },
    include: { items: { orderBy: { isChecked: 'asc' } } },
  })

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  return c.json({ list })
})

// POST /households/:householdId/shopping
shoppingRoutes.post('/', async (c) => {
  const householdId = c.get('householdId')
  const { name } = await c.req.json()

  if (!name || !name.trim()) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const list = await prisma.shoppingList.create({
    data: {
      name: name.trim(),
      householdId,
    },
    include: { items: true },
  })

  return c.json({ list }, 201)
})

// POST /households/:householdId/shopping/:id/items
shoppingRoutes.post('/:id/items', async (c) => {
  const householdId = c.get('householdId')
  const listId = c.req.param('id')
  const data = await c.req.json()

  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, householdId },
  })

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  const parsed = itemSchema.parse(data)

  const item = await prisma.shoppingItem.create({
    data: {
      name: parsed.name,
      quantity: parsed.quantity,
      listId,
    },
  })

  return c.json({ item }, 201)
})

// PATCH /households/:householdId/shopping/:listId/items/:itemId
shoppingRoutes.patch('/:listId/items/:itemId', async (c) => {
  const householdId = c.get('householdId')
  const { listId, itemId } = c.req.param()

  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, householdId },
  })

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  const item = await prisma.shoppingItem.findFirst({
    where: { id: itemId, listId },
  })

  if (!item) {
    return c.json({ error: 'Item not found' }, 404)
  }

  const updated = await prisma.shoppingItem.update({
    where: { id: itemId },
    data: { isChecked: !item.isChecked },
  })

  return c.json({ item: updated })
})

// DELETE /households/:householdId/shopping/:listId/items/:itemId
shoppingRoutes.delete('/:listId/items/:itemId', async (c) => {
  const householdId = c.get('householdId')
  const { listId, itemId } = c.req.param()

  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, householdId },
  })

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  await prisma.shoppingItem.delete({ where: { id: itemId } })

  return c.json({ success: true })
})

// DELETE /households/:householdId/shopping/:id
shoppingRoutes.delete('/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')

  const list = await prisma.shoppingList.findFirst({
    where: { id, householdId },
  })

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  await prisma.shoppingList.delete({ where: { id } })

  return c.json({ success: true })
})
