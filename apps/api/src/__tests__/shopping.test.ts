import { describe, it, expect, afterEach } from 'vitest'
import { cleanupAllTestData, uniqueEmail } from './helpers'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'
import app from '../index'

async function createTestUser(data: { email?: string; name?: string } = {}) {
  const email = data.email ?? uniqueEmail()
  const name = data.name ?? 'Test User'
  const password = await bcrypt.hash('password123', 10)
  const user = await prisma.user.create({
    data: { email, password, name },
    select: { id: true, email: true, name: true, currentHouseholdId: true, createdAt: true },
  })
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })
  return { user, token }
}

async function createTestHousehold() {
  const { user, token } = await createTestUser()
  const household = await prisma.household.create({
    data: { name: 'Test Household', members: { create: { userId: user.id, role: 'OWNER' } } },
  })
  await prisma.user.update({ where: { id: user.id }, data: { currentHouseholdId: household.id } })
  return { user, token, householdId: household.id }
}

describe('GET /households/:householdId/shopping', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('returns all shopping lists', async () => {
    const { token, householdId } = await createTestHousehold()
    await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })

    const res = await app.request(`/households/${householdId}/shopping`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lists.length).toBeGreaterThanOrEqual(1)
    expect(body.lists[0].items).toBeDefined()
  })

  it('returns 403 for non-member', async () => {
    const { householdId } = await createTestHousehold()
    const { token } = await createTestUser({ email: 'outsider@example.com' })

    const res = await app.request(`/households/${householdId}/shopping`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(403)
  })
})

describe('GET /households/:householdId/shopping/:id', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('returns a specific list with items', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })
    await prisma.shoppingItem.create({ data: { name: 'Milk', listId: list.id } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.list.name).toBe('Groceries')
    expect(body.list.items.length).toBe(1)
  })

  it('returns 404 for non-existent list', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/shopping/nonexistent-id`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(404)
  })
})

describe('POST /households/:householdId/shopping', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('creates a shopping list', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/shopping`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Weekly Groceries' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.list.name).toBe('Weekly Groceries')
    expect(body.list.isActive).toBe(true)
  })

  it('rejects missing name', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/shopping`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Name is required')
  })

  it('rejects empty name', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/shopping`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    })

    expect(res.status).toBe(400)
  })
})

describe('POST /households/:householdId/shopping/:id/items', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('adds an item to a list', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bread' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.item.name).toBe('Bread')
    expect(body.item.quantity).toBe(1)
    expect(body.item.isChecked).toBe(false)
  })

  it('adds an item with custom quantity', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Milk', quantity: 3 }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.item.quantity).toBe(3)
  })

  it('rejects missing item name', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 2 }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects quantity less than 1', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bad', quantity: 0 }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent list', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/shopping/nonexistent-id/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bread' }),
    })

    expect(res.status).toBe(404)
  })
})

describe('PATCH /households/:householdId/shopping/:listId/items/:itemId', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('toggles item isChecked', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })
    const item = await prisma.shoppingItem.create({ data: { name: 'Milk', listId: list.id, isChecked: false } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.item.isChecked).toBe(true)

    const res2 = await app.request(`/households/${householdId}/shopping/${list.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })

    const body2 = await res2.json()
    expect(body2.item.isChecked).toBe(false)
  })

  it('returns 404 for non-existent item', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}/items/nonexistent-id`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /households/:householdId/shopping/:listId/items/:itemId', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('deletes an item', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })
    const item = await prisma.shoppingItem.create({ data: { name: 'Milk', listId: list.id } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}/items/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const deleted = await prisma.shoppingItem.findUnique({ where: { id: item.id } })
    expect(deleted).toBeNull()
  })

  it('returns 404 for non-existent item', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}/items/nonexistent-id`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /households/:householdId/shopping/:id', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('deletes a shopping list and its items', async () => {
    const { token, householdId } = await createTestHousehold()
    const list = await prisma.shoppingList.create({ data: { name: 'Groceries', householdId } })
    await prisma.shoppingItem.create({ data: { name: 'Milk', listId: list.id } })

    const res = await app.request(`/households/${householdId}/shopping/${list.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const deleted = await prisma.shoppingList.findUnique({ where: { id: list.id } })
    expect(deleted).toBeNull()

    const items = await prisma.shoppingItem.findMany({ where: { listId: list.id } })
    expect(items.length).toBe(0)
  })

  it('returns 404 for non-existent list', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/shopping/nonexistent-id`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(404)
  })
})
