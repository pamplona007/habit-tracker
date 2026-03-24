import { Hono } from 'hono'
import { prisma } from '../db'
import { z } from 'zod'

export const shoppingRoutes = new Hono()

const itemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().min(1).default(1),
})

// List all shopping lists
shoppingRoutes.get('/', async (c) => {
  const user = c.get('user')

  const lists = await prisma.shoppingList.findMany({
    where: { userId: user.id },
    include: {
      items: {
        orderBy: { isChecked: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return c.json({ lists })
})

// Get single shopping list
shoppingRoutes.get('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId: user.id },
    include: {
      items: {
        orderBy: { isChecked: 'asc' },
      },
    },
  })

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  return c.json({ list })
})

// Create shopping list
shoppingRoutes.post('/', async (c) => {
  const user = c.get('user')
  const { name } = await c.req.json()

  if (!name) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const list = await prisma.shoppingList.create({
    data: {
      name,
      userId: user.id,
    },
    include: { items: true },
  })

  return c.json({ list }, 201)
})

// Add item to list
shoppingRoutes.post('/:id/items', async (c) => {
  const user = c.get('user')
  const listId = c.req.param('id')
  const data = await c.req.json()

  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId: user.id },
  })

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  const parsed = itemSchema.parse(data)

  const item = await prisma.shoppingItem.create({
    data: {
      ...parsed,
      listId,
    },
  })

  return c.json({ item }, 201)
})

// Toggle item checked
shoppingRoutes.patch('/:listId/items/:itemId', async (c) => {
  const user = c.get('user')
  const { listId, itemId } = c.req.param()

  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId: user.id },
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

// Delete item
shoppingRoutes.delete('/:listId/items/:itemId', async (c) => {
  const user = c.get('user')
  const { listId, itemId } = c.req.param()

  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId: user.id },
  })

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  await prisma.shoppingItem.delete({ where: { id: itemId } })

  return c.json({ success: true })
})

// Delete shopping list
shoppingRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId: user.id },
  })

  if (!list) {
    return c.json({ error: 'List not found' }, 404)
  }

  await prisma.shoppingList.delete({ where: { id } })

  return c.json({ success: true })
})
