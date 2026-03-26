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

function getStartOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function getStartOfMonth(d: Date): Date {
  const date = new Date(d)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000)
}

describe('GET /households/:householdId/tasks — completed field', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('ONE_TIME task: completed=true when completion exists', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'One-time', householdId, type: 'ONE_TIME' } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL' } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const t = body.tasks.find((t: { id: string }) => t.id === task.id)
    expect(t.completed).toBe(true)
    expect(t.completionType).toBe('FULL')
  })

  it('ONE_TIME task: completed=false when no completion', async () => {
    const { token, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'One-time', householdId, type: 'ONE_TIME' } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const t = body.tasks.find((t: { id: string }) => t.id === task.id)
    expect(t.completed).toBe(false)
    expect(t.completionType).toBeNull()
  })

  it('DAILY task: completed=true when completed today', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Daily', householdId, type: 'DAILY' } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: new Date() } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const t = body.tasks.find((t: { id: string }) => t.id === task.id)
    expect(t.completed).toBe(true)
    expect(t.completionType).toBe('FULL')
  })

  it('DAILY task: completed=false when last completion was yesterday', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Daily', householdId, type: 'DAILY' } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: daysAgo(1) } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const t = body.tasks.find((t: { id: string }) => t.id === task.id)
    expect(t.completed).toBe(false)
    expect(t.completionType).toBeNull()
  })

  it('WEEKLY task: completed=false when last completion was last week', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Weekly', householdId, type: 'WEEKLY' } })
    const lastWeek = new Date(getStartOfWeek(new Date()))
    lastWeek.setDate(lastWeek.getDate() - 7)
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: lastWeek } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const t = body.tasks.find((t: { id: string }) => t.id === task.id)
    expect(t.completed).toBe(false)
  })

  it('MONTHLY task: completed=false when last completion was last month', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Monthly', householdId, type: 'MONTHLY' } })
    const lastMonth = new Date(getStartOfMonth(new Date()))
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: lastMonth } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const t = body.tasks.find((t: { id: string }) => t.id === task.id)
    expect(t.completed).toBe(false)
  })

  it('does not include completions array in response', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL' } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const t = body.tasks.find((t: { id: string }) => t.id === task.id)
    expect(t.completions).toBeUndefined()
  })

  it('returns latest completionType for DAILY task completed today as PARTIAL', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Daily', householdId, type: 'DAILY' } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'PARTIAL', completedAt: new Date() } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const t = body.tasks.find((t: { id: string }) => t.id === task.id)
    expect(t.completed).toBe(true)
    expect(t.completionType).toBe('PARTIAL')
  })

  it('completing a DAILY task via API sets completed=true for today', async () => {
    const { token, householdId } = await createTestHousehold()
    const taskRes = await app.request(`/households/${householdId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Daily Task', type: 'DAILY' }),
    })
    const task = (await taskRes.json()).task

    await app.request(`/households/${householdId}/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'FULL' }),
    })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const body = await res.json()
    const t = body.tasks.find((t: { id: string }) => t.id === task.id)
    expect(t.completed).toBe(true)
    expect(t.completionType).toBe('FULL')
  })

  it('uncompleting a DAILY task sets completed=false', async () => {
    const { token, user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Daily', householdId, type: 'DAILY' } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL', completedAt: new Date() } })

    const res = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    let body = await res.json()
    expect(body.tasks.find((t: { id: string }) => t.id === task.id).completed).toBe(true)

    // Uncomplete
    await app.request(`/households/${householdId}/tasks/${task.id}/complete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    const res2 = await app.request(`/households/${householdId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    body = await res2.json()
    expect(body.tasks.find((t: { id: string }) => t.id === task.id).completed).toBe(false)
  })
})
