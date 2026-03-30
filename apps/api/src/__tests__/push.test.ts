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

describe('POST /push/subscribe', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('creates push subscription', async () => {
    const { token, user } = await createTestUser()

    const res = await app.request('/push/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://fcm.googleapis.com/test-endpoint',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.subscription.endpoint).toBe('https://fcm.googleapis.com/test-endpoint')
    expect(body.subscription.userId).toBe(user.id)
    expect(body.subscription.isActive).toBe(true)
  })

  it('rejects invalid subscription data', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/push/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'not-a-url' }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects missing keys', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/push/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/test' }),
    })

    expect(res.status).toBe(400)
  })

  it('upserts existing subscription', async () => {
    const { token, user } = await createTestUser()
    const endpoint = 'https://fcm.googleapis.com/upsert-test'

    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint,
        keys: JSON.stringify({ p256dh: 'old-p256dh', auth: 'old-auth' }),
        isActive: false,
      },
    })

    const res = await app.request('/push/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.subscription.isActive).toBe(true)

    const subs = await prisma.pushSubscription.findMany({ where: { endpoint } })
    expect(subs.length).toBe(1)
  })
})

describe('DELETE /push/subscribe/:id', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('deletes own subscription', async () => {
    const { token, user } = await createTestUser()

    const sub = await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: 'https://fcm.googleapis.com/delete-test',
        keys: JSON.stringify({ p256dh: 'test', auth: 'test' }),
      },
    })

    const res = await app.request(`/push/subscribe/${sub.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)

    const deleted = await prisma.pushSubscription.findUnique({ where: { id: sub.id } })
    expect(deleted).toBeNull()
  })

  it('returns 404 for other user subscription', async () => {
    const { token } = await createTestUser()
    const otherUser = await createTestUser({ email: 'other@example.com' })

    const sub = await prisma.pushSubscription.create({
      data: {
        userId: otherUser.user.id,
        endpoint: 'https://fcm.googleapis.com/other-user',
        keys: JSON.stringify({ p256dh: 'test', auth: 'test' }),
      },
    })

    const res = await app.request(`/push/subscribe/${sub.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(404)
  })

  it('returns 404 for non-existent subscription', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/push/subscribe/non-existent-id', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(404)
  })
})

describe('GET /push/settings', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('returns default settings when none exist', async () => {
    const { token, user } = await createTestUser()

    const res = await app.request('/push/settings', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.userId).toBe(user.id)
    expect(body.settings.morningReminderEnabled).toBe(true)
    expect(body.settings.morningReminderTime).toBe('09:00')
    expect(body.settings.taskCreatedEnabled).toBe(true)
    expect(body.settings.taskCompletedEnabled).toBe(true)
  })

  it('returns existing settings', async () => {
    const { token, user } = await createTestUser()

    await prisma.notificationSettings.create({
      data: {
        userId: user.id,
        morningReminderEnabled: false,
        morningReminderTime: '08:00',
        taskCreatedEnabled: false,
        taskCompletedEnabled: false,
      },
    })

    const res = await app.request('/push/settings', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.morningReminderEnabled).toBe(false)
    expect(body.settings.morningReminderTime).toBe('08:00')
    expect(body.settings.taskCreatedEnabled).toBe(false)
    expect(body.settings.taskCompletedEnabled).toBe(false)
  })
})

describe('PATCH /push/settings', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('updates settings', async () => {
    const { token, user } = await createTestUser()

    const res = await app.request('/push/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        morningReminderEnabled: false,
        morningReminderTime: '10:00',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.morningReminderEnabled).toBe(false)
    expect(body.settings.morningReminderTime).toBe('10:00')
    expect(body.settings.taskCreatedEnabled).toBe(true)
  })

  it('rejects invalid time format', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/push/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        morningReminderTime: '9:00',
      }),
    })

    expect(res.status).toBe(400)
  })

  it('creates settings if none exist', async () => {
    const { token, user } = await createTestUser()

    const res = await app.request('/push/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskCompletedEnabled: false,
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.userId).toBe(user.id)
    expect(body.settings.taskCompletedEnabled).toBe(false)
  })
})