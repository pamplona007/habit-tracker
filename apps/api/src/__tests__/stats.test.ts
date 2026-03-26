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

async function createTestHousehold(name = 'Test Household') {
  const { user, token } = await createTestUser()
  const household = await prisma.household.create({
    data: { name, members: { create: { userId: user.id, role: 'OWNER' } } },
  })
  await prisma.user.update({ where: { id: user.id }, data: { currentHouseholdId: household.id } })
  return { user, token, householdId: household.id }
}

describe('GET /stats — aggregate platform stats', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('returns zero stats when no data exists', async () => {
    const res = await app.request('/stats')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.households).toBe(0)
    expect(body.tasksCompleted).toBe(0)
    expect(body.bestStreak).toBe(0)
  })

  it('returns correct household count', async () => {
    await createTestHousehold()
    await createTestHousehold()
    await createTestHousehold()

    const res = await app.request('/stats')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.households).toBe(3)
  })

  it('returns correct task completion count', async () => {
    const { user, householdId } = await createTestHousehold()
    const task = await prisma.task.create({ data: { name: 'Task', householdId, type: 'ONE_TIME' } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL' } })
    await prisma.taskCompletion.create({ data: { taskId: task.id, userId: user.id, type: 'FULL' } })

    const res = await app.request('/stats')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasksCompleted).toBe(2)
  })

  it('returns the best streak across all households', async () => {
    const { householdId: hh1 } = await createTestHousehold()
    const { householdId: hh2 } = await createTestHousehold()

    await prisma.household.update({ where: { id: hh1 }, data: { streak: 5, longestStreak: 10 } })
    await prisma.household.update({ where: { id: hh2 }, data: { streak: 12, longestStreak: 12 } })

    const res = await app.request('/stats')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.bestStreak).toBe(12)
  })

  it('does not require authentication', async () => {
    const res = await app.request('/stats')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('households')
    expect(body).toHaveProperty('tasksCompleted')
    expect(body).toHaveProperty('bestStreak')
  })
})
