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

async function createTask(token: string, householdId: string, name: string) {
  const res = await app.request(`/households/${householdId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return (await res.json()).task
}

async function completeTask(token: string, householdId: string, taskId: string, type: 'FULL' | 'PARTIAL' = 'FULL') {
  const res = await app.request(`/households/${householdId}/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
  return res.status === 201
}

describe('GET /households/:householdId/streak', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('returns zero streak when no completions exist', async () => {
    const { token, householdId } = await createTestHousehold()
    await createTask(token, householdId, 'Task')

    const res = await app.request(`/households/${householdId}/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.streak.current).toBe(0)
    expect(body.streak.longest).toBe(0)
    expect(body.streak.lastCompletedDate).toBeNull()
  })

  it('returns current streak of 1 for completion today', async () => {
    const { token, householdId } = await createTestHousehold()
    const task = await createTask(token, householdId, 'Task')
    await completeTask(token, householdId, task.id)

    const res = await app.request(`/households/${householdId}/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.streak.current).toBe(1)
    expect(body.streak.longest).toBe(1)
    expect(body.streak.lastCompletedDate).not.toBeNull()
  })

  it('returns current streak of 2 for consecutive days including yesterday', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await createTask(token, householdId, 'Task')


    await prisma.taskCompletion.create({
      data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: new Date(Date.now() - 86400000) },
    })
    await completeTask(token, householdId, task.id)

    const res = await app.request(`/households/${householdId}/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.streak.current).toBe(2)
    expect(body.streak.longest).toBe(2)
  })

  it('breaks streak when a day is missed', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await createTask(token, householdId, 'Task')


    await prisma.taskCompletion.create({
      data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: new Date(Date.now() - 2 * 86400000) },
    })
    await completeTask(token, householdId, task.id)

    const res = await app.request(`/households/${householdId}/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.streak.current).toBe(1)
    expect(body.streak.longest).toBe(1)
  })

  it('tracks longest streak correctly with gap between runs', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await createTask(token, householdId, 'Task')


    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: new Date(Date.now() - 86400000) } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: new Date(Date.now() - 2 * 86400000) } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: new Date(Date.now() - 3 * 86400000) } })


    await completeTask(token, householdId, task.id)

    const res = await app.request(`/households/${householdId}/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.streak.current).toBe(4)
    expect(body.streak.longest).toBe(4)
  })

  it('aggregates completions from multiple tasks', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task1 = await createTask(token, householdId, 'Task 1')
    const task2 = await createTask(token, householdId, 'Task 2')


    await prisma.taskCompletion.create({ data: { taskId: task1.id, userId: user.id, type: 'FULL', completedAt: new Date(Date.now() - 86400000) } })
    await completeTask(token, householdId, task2.id)

    const res = await app.request(`/households/${householdId}/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.streak.current).toBe(2)
    expect(body.streak.longest).toBe(2)
  })

  it('aggregates completions from multiple users', async () => {
    const { token, user: owner, householdId } = await createTestHousehold()
    const task = await createTask(token, householdId, 'Task')


    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: owner.id, type: 'FULL', completedAt: new Date(Date.now() - 86400000) } })


    const { user: otherUser, token: otherToken } = await createTestUser({ email: 'other@example.com' })
    await prisma.householdMember.create({ data: { householdId, userId: otherUser.id, role: 'MEMBER' } })
    await prisma.user.update({ where: { id: otherUser.id }, data: { currentHouseholdId: householdId } })
    await createTask(otherToken, householdId, 'Task 2')
    await completeTask(otherToken, householdId, task.id)

    const res = await app.request(`/households/${householdId}/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.streak.current).toBe(2)
    expect(body.streak.longest).toBe(2)
  })

  it('returns 403 for non-member', async () => {
    const { householdId } = await createTestHousehold()
    const { token } = await createTestUser({ email: 'outsider@example.com' })

    const res = await app.request(`/households/${householdId}/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(403)
  })

  it('returns 401 without auth token', async () => {
    const { householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/streak`)

    expect(res.status).toBe(401)
  })
})
