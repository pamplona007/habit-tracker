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

describe('GET /households/:householdId/tasks', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('returns all tasks for household', async () => {
    const { token, householdId } = await createTestHousehold()
    await prisma.task.create({ data: { name: 'Test Task', householdId } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks.length).toBeGreaterThanOrEqual(1)
    expect(body.tasks[0].name).toBe('Test Task')
  })

  it('filters tasks by type', async () => {
    const { token, householdId } = await createTestHousehold()
    await prisma.task.create({ data: { name: 'Daily Task', householdId, type: 'DAILY' } })
    await prisma.task.create({ data: { name: 'OneTime Task', householdId, type: 'ONE_TIME' } })

    const res = await app.request(`/households/${householdId}/tasks?type=DAILY`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks.every((t: { type: string }) => t.type === 'DAILY')).toBe(true)
  })

  it('returns 403 for non-member', async () => {
    const { householdId } = await createTestHousehold()
    const { token } = await createTestUser({ email: 'outsider@example.com' })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(403)
  })
})

describe('POST /households/:householdId/tasks', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('creates a task with default values', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Task' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.task.name).toBe('New Task')
    expect(body.task.type).toBe('ONE_TIME')
    expect(body.task.priority).toBe('normal')
    expect(body.task.isActive).toBe(true)
  })

  it('creates a daily task with dayOfWeek', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Weekly Task', type: 'WEEKLY', dayOfWeek: 1 }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.task.type).toBe('WEEKLY')
    expect(body.task.dayOfWeek).toBe(1)
  })

  it('creates a monthly task with dayOfMonth', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Monthly Task', type: 'MONTHLY', dayOfMonth: 15 }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.task.type).toBe('MONTHLY')
    expect(body.task.dayOfMonth).toBe(15)
  })

  it('creates a task with deadline', async () => {
    const { token, householdId } = await createTestHousehold()
    const deadline = new Date(Date.now() + 86400000).toISOString()

    const res = await app.request(`/households/${householdId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Deadline Task', type: 'ONE_TIME', deadline }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.task.deadline).toBeDefined()
  })

  it('creates a high priority task', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Urgent Task', priority: 'urgent' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.task.priority).toBe('urgent')
  })

  it('rejects invalid task type', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bad Task', type: 'INVALID' }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects invalid dayOfWeek', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bad Task', type: 'WEEKLY', dayOfWeek: 7 }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects invalid dayOfMonth', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bad Task', type: 'MONTHLY', dayOfMonth: 32 }),
    })

    expect(res.status).toBe(400)
  })
})

describe('PATCH /households/:householdId/tasks/:id', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('updates task name', async () => {
    const { token, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Old Name', householdId } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.name).toBe('New Name')
  })

  it('updates task priority', async () => {
    const { token, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId, priority: 'low' } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'high' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.priority).toBe('high')
  })

  it('deactivates a task', async () => {
    const { token, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId, isActive: true } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.isActive).toBe(false)
  })

  it('returns 404 for non-existent task', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks/nonexistent-id`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Task not found')
  })
})

describe('POST /households/:householdId/tasks/:id/complete', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('completes a task as FULL', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'FULL' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.completion.type).toBe('FULL')
    expect(body.completion.user.id).toBe(user.id)
  })

  it('completes a task as PARTIAL', async () => {
    const { token, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PARTIAL' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.completion.type).toBe('PARTIAL')
  })

  it('defaults to FULL when no type specified', async () => {
    const { token, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.completion.type).toBe('FULL')
  })

  it('returns 404 for non-existent task', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks/nonexistent-id/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'FULL' }),
    })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /households/:householdId/tasks/:id', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('deletes a task', async () => {
    const { token, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const deleted = await prisma.task.findUnique({ where: { id: task.id } })
    expect(deleted).toBeNull()
  })

  it('returns 404 for non-existent task', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/tasks/nonexistent-id`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /households/:householdId/tasks/:id/complete', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('removes latest completion', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL' } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}/complete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const completions = await prisma.taskCompletion.findMany({ where: { taskId: task.id } })
    expect(completions.length).toBe(0)
  })

  it('returns 400 when no completion to remove', async () => {
    const { token, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}/complete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No completion to remove')
  })

  it('only removes own completion', async () => {
    const { token: ownerToken, user: owner, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: owner.id, type: 'FULL' } })

    const { user: otherUser, token: otherToken } = await createTestUser({ email: 'other@example.com' })
    await prisma.householdMember.create({ data: { householdId, userId: otherUser.id, role: 'MEMBER' } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: otherUser.id, type: 'PARTIAL' } })

    const res = await app.request(`/households/${householdId}/tasks/${task.id}/complete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    })

    expect(res.status).toBe(200)

    const completions = await prisma.taskCompletion.findMany({ where: { taskId: task.id } })
    expect(completions.length).toBe(1)
    expect(completions[0].userId).toBe(otherUser.id)
  })
})
