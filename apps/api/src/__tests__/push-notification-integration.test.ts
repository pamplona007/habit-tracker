import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanupAllTestData, uniqueEmail } from './helpers'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'
import app from '../index'

vi.mock('../services/notification', () => ({
  sendToUser: vi.fn().mockResolvedValue({ sent: 1, deactivated: 0 }),
  broadcastToHousehold: vi.fn().mockResolvedValue({ sent: 1, deactivated: 0 }),
  sendPushNotification: vi.fn().mockResolvedValue({ success: true }),
}))

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

describe('push notification integration', () => {
  afterEach(async () => {
    vi.clearAllMocks()
    await cleanupAllTestData()
  })

  describe('task creation', () => {
    it('sends notification when task is created', async () => {
      const { broadcastToHousehold } = await import('../services/notification')
      const { token, householdId } = await createTestHousehold()

      const res = await app.request(`/households/${householdId}/tasks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Task' }),
      })

      expect(res.status).toBe(201)
      expect(broadcastToHousehold).toHaveBeenCalledWith(
        householdId,
        expect.any(String),
        { title: 'Nova tarefa', body: expect.stringContaining('Tarefa criada') },
        prisma
      )
    })
  })

  describe('task completion', () => {
    it('sends notification when task is completed', async () => {
      const { broadcastToHousehold } = await import('../services/notification')
      const { token, user, householdId } = await createTestHousehold()

      const task = await prisma.task.create({
        data: { name: 'Task', householdId },
      })

      const res = await app.request(`/households/${householdId}/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'FULL' }),
      })

      expect(res.status).toBe(201)
      expect(broadcastToHousehold).toHaveBeenCalledWith(
        householdId,
        user.id,
        { title: 'Tarefa concluída', body: expect.stringContaining(`${user.name} completou`) },
        prisma
      )
    })
  })
})