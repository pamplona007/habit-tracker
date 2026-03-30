import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { cleanupAllTestData, uniqueEmail } from './helpers'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'

const mockSendNotification = vi.fn().mockResolvedValue({ statusCode: 201 })

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

async function createTestHousehold() {
  const { user, token } = await createTestUser()
  const household = await prisma.household.create({
    data: { name: 'Test Household', members: { create: { userId: user.id, role: 'OWNER' } } },
  })
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { currentHouseholdId: household.id },
    select: { id: true, email: true, name: true, currentHouseholdId: true, createdAt: true },
  })
  return { user: updatedUser, token, householdId: household.id }
}

describe('GET /cron/morning-reminders', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret'
  })

  afterEach(async () => {
    vi.clearAllMocks()
    await cleanupAllTestData()
  })

  it('returns 401 without CRON_SECRET', async () => {
    const { default: app } = await import('../index')
    delete process.env.CRON_SECRET

    const res = await app.request('/cron/morning-reminders')

    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong CRON_SECRET', async () => {
    const { default: app } = await import('../index')

    const res = await app.request('/cron/morning-reminders', {
      headers: { Authorization: 'CRON_SECRET wrong-secret' },
    })

    expect(res.status).toBe(401)
  })

  it('returns 200 with correct CRON_SECRET', async () => {
    const { default: app } = await import('../index')

    const res = await app.request('/cron/morning-reminders', {
      headers: { Authorization: 'CRON_SECRET test-secret' },
    })

    expect(res.status).toBe(200)
  })

  it('sends reminders to users with morningReminderEnabled', async () => {
    const { default: app } = await import('../index')
    const { prisma: testPrisma } = await import('../db')

    const { user } = await createTestHousehold()

    await prisma.notificationSettings.create({
      data: { userId: user.id, morningReminderEnabled: true },
    })
    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: 'https://fcm.googleapis.com/test',
        keys: JSON.stringify({ p256dh: 'test', auth: 'test' }),
      },
    })
    await prisma.task.create({
      data: {
        name: 'Daily Task',
        householdId: user.currentHouseholdId!,
        type: 'DAILY',
        isActive: true,
      },
    })

    const res = await app.request('/cron/morning-reminders', {
      headers: { Authorization: 'CRON_SECRET test-secret' },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBeGreaterThan(0)
  })

  it('does not send to users with morningReminderEnabled=false', async () => {
    const { default: app } = await import('../index')

    const { user } = await createTestHousehold()

    await prisma.notificationSettings.create({
      data: { userId: user.id, morningReminderEnabled: false },
    })
    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: 'https://fcm.googleapis.com/test',
        keys: JSON.stringify({ p256dh: 'test', auth: 'test' }),
      },
    })

    const res = await app.request('/cron/morning-reminders', {
      headers: { Authorization: 'CRON_SECRET test-secret' },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(0)
  })
})