import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanupAllTestData, uniqueEmail } from './helpers'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'

const mockSendNotification = vi.fn()
vi.mock('web-push', () => ({
  default: {
    sendNotification: mockSendNotification,
    setVapidDetails: vi.fn(),
  },
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

describe('notificationService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cleanupAllTestData()
  })

  describe('sendToUser', () => {
    it('sends push notification to active subscription', async () => {
      mockSendNotification.mockResolvedValue({ statusCode: 201 })
      const { user } = await createTestUser()

      await prisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: 'https://fcm.googleapis.com/test',
          keys: JSON.stringify({ p256dh: 'test-p256dh', auth: 'test-auth' }),
        },
      })

      const { sendToUser } = await import('../services/notification')
      const result = await sendToUser(user.id, { title: 'Test', body: 'Hello' }, prisma)

      expect(mockSendNotification).toHaveBeenCalled()
      expect(result.sent).toBe(1)
      expect(result.deactivated).toBe(0)
    })

    it('marks subscription as inactive on 410 Gone', async () => {
      mockSendNotification.mockRejectedValue({ statusCode: 410 })
      const { user } = await createTestUser()

      const sub = await prisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: 'https://expired.endpoint',
          keys: JSON.stringify({ p256dh: 'test', auth: 'test' }),
          isActive: true,
        },
      })

      const { sendToUser } = await import('../services/notification')
      const result = await sendToUser(user.id, { title: 'Test', body: 'Hi' }, prisma)

      expect(result.sent).toBe(0)
      expect(result.deactivated).toBe(1)

      const updated = await prisma.pushSubscription.findUnique({ where: { id: sub.id } })
      expect(updated!.isActive).toBe(false)
    })

    it('marks subscription as inactive on 404 Not Found', async () => {
      mockSendNotification.mockRejectedValue({ statusCode: 404 })
      const { user } = await createTestUser()

      const sub = await prisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: 'https://notfound.endpoint',
          keys: JSON.stringify({ p256dh: 'test', auth: 'test' }),
          isActive: true,
        },
      })

      const { sendToUser } = await import('../services/notification')
      const result = await sendToUser(user.id, { title: 'Test', body: 'Hi' }, prisma)

      expect(result.sent).toBe(0)
      expect(result.deactivated).toBe(1)

      const updated = await prisma.pushSubscription.findUnique({ where: { id: sub.id } })
      expect(updated!.isActive).toBe(false)
    })

    it('does not send to inactive subscriptions', async () => {
      const { user } = await createTestUser()

      await prisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: 'https://inactive.endpoint',
          keys: JSON.stringify({ p256dh: 'test', auth: 'test' }),
          isActive: false,
        },
      })

      const { sendToUser } = await import('../services/notification')
      const result = await sendToUser(user.id, { title: 'Test', body: 'Hello' }, prisma)

      expect(mockSendNotification).not.toHaveBeenCalled()
      expect(result.sent).toBe(0)
    })
  })

  describe('broadcastToHousehold', () => {
    it('sends notification to all household members except excluded user', async () => {
      mockSendNotification.mockResolvedValue({ statusCode: 201 })
      const { user: owner, token: ownerToken } = await createTestUser()
      const household = await prisma.household.create({
        data: { name: 'Test Household', members: { create: { userId: owner.id, role: 'OWNER' } } },
      })
      await prisma.user.update({ where: { id: owner.id }, data: { currentHouseholdId: household.id } })

      const member2 = await createTestUser({ email: 'member2@example.com', name: 'Member 2' })
      await prisma.householdMember.create({
        data: { householdId: household.id, userId: member2.user.id, role: 'MEMBER' },
      })
      await prisma.pushSubscription.create({
        data: {
          userId: member2.user.id,
          endpoint: 'https://fcm.googleapis.com/member2',
          keys: JSON.stringify({ p256dh: 'test', auth: 'test' }),
        },
      })

      const { broadcastToHousehold } = await import('../services/notification')
      const result = await broadcastToHousehold(
        household.id,
        owner.id,
        { title: 'Test Broadcast', body: 'Hello household' },
        prisma
      )

      expect(mockSendNotification).toHaveBeenCalledTimes(1)
      expect(result.sent).toBe(1)
    })

    it('excludes the specified user from broadcast', async () => {
      mockSendNotification.mockResolvedValue({ statusCode: 201 })
      const { user: owner } = await createTestUser()
      const household = await prisma.household.create({
        data: { name: 'Test Household', members: { create: { userId: owner.id, role: 'OWNER' } } },
      })
      await prisma.user.update({ where: { id: owner.id }, data: { currentHouseholdId: household.id } })

      await prisma.pushSubscription.create({
        data: {
          userId: owner.id,
          endpoint: 'https://fcm.googleapis.com/owner',
          keys: JSON.stringify({ p256dh: 'test', auth: 'test' }),
        },
      })

      const { broadcastToHousehold } = await import('../services/notification')
      const result = await broadcastToHousehold(
        household.id,
        owner.id,
        { title: 'Test', body: 'Should not send to owner' },
        prisma
      )

      expect(mockSendNotification).not.toHaveBeenCalled()
      expect(result.sent).toBe(0)
    })
  })
})
