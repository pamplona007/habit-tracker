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

describe('GET /households/:householdId/notices', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('returns all notices for household', async () => {
    const { token, householdId } = await createTestHousehold()
    await prisma.notice.create({ data: { title: 'Notice 1', content: 'Content 1', householdId } })
    await prisma.notice.create({ data: { title: 'Notice 2', content: 'Content 2', householdId } })

    const res = await app.request(`/households/${householdId}/notices`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notices.length).toBe(2)
  })

  it('orders notices by priority desc', async () => {
    const { token, householdId } = await createTestHousehold()
    await prisma.notice.create({ data: { title: 'Low', content: 'L', householdId, priority: 'low' } })
    await prisma.notice.create({ data: { title: 'Urgent', content: 'U', householdId, priority: 'urgent' } })

    const res = await app.request(`/households/${householdId}/notices`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const body = await res.json()
    expect(body.notices[0].priority).toBe('urgent')
  })

  it('returns 403 for non-member', async () => {
    const { householdId } = await createTestHousehold()
    const { token } = await createTestUser({ email: 'outsider@example.com' })

    const res = await app.request(`/households/${householdId}/notices`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(403)
  })
})

describe('POST /households/:householdId/notices', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('creates a notice with defaults', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/notices`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Notice', content: 'Notice content' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.notice.title).toBe('New Notice')
    expect(body.notice.priority).toBe('normal')
    expect(body.notice.isActive).toBe(true)
  })

  it('creates a high priority notice with dates', async () => {
    const { token, householdId } = await createTestHousehold()
    const startDate = new Date().toISOString()
    const endDate = new Date(Date.now() + 86400000).toISOString()

    const res = await app.request(`/households/${householdId}/notices`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Important Notice',
        content: 'Content',
        priority: 'high',
        startDate,
        endDate,
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.notice.priority).toBe('high')
    expect(body.notice.startDate).toBeDefined()
    expect(body.notice.endDate).toBeDefined()
  })

  it('rejects invalid priority', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/notices`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Bad', content: 'C', priority: 'superhigh' }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects missing title', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/notices`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Content only' }),
    })

    expect(res.status).toBe(400)
  })
})

describe('PATCH /households/:householdId/notices/:id', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('updates notice title', async () => {
    const { token, householdId } = await createTestHousehold()
    const notice = await prisma.notice.create({ data: { title: 'Old Title', content: 'C', householdId } })

    const res = await app.request(`/households/${householdId}/notices/${notice.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notice.title).toBe('New Title')
  })

  it('updates notice priority', async () => {
    const { token, householdId } = await createTestHousehold()
    const notice = await prisma.notice.create({ data: { title: 'T', content: 'C', householdId, priority: 'low' } })

    const res = await app.request(`/households/${householdId}/notices/${notice.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'urgent' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notice.priority).toBe('urgent')
  })

  it('deactivates a notice', async () => {
    const { token, householdId } = await createTestHousehold()
    const notice = await prisma.notice.create({ data: { title: 'T', content: 'C', householdId, isActive: true } })

    const res = await app.request(`/households/${householdId}/notices/${notice.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notice.isActive).toBe(false)
  })

  it('returns 404 for non-existent notice', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/notices/nonexistent-id`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' }),
    })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /households/:householdId/notices/:id', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('deletes a notice', async () => {
    const { token, householdId } = await createTestHousehold()
    const notice = await prisma.notice.create({ data: { title: 'To Delete', content: 'C', householdId } })

    const res = await app.request(`/households/${householdId}/notices/${notice.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const deleted = await prisma.notice.findUnique({ where: { id: notice.id } })
    expect(deleted).toBeNull()
  })

  it('returns 404 for non-existent notice', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/notices/nonexistent-id`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(404)
  })
})
