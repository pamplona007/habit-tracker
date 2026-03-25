import { describe, it, expect, beforeAll } from 'bun:test'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'
import app from '../index'

// Helper to create a test user and return user + token
async function createTestUser(data: { email?: string; name?: string } = {}) {
  const email = data.email ?? `test-${Date.now()}@example.com`
  const name = data.name ?? 'Test User'
  const password = await bcrypt.hash('password123', 10)

  const user = await prisma.user.create({
    data: { email, password, name },
    select: {
      id: true,
      email: true,
      name: true,
      currentHouseholdId: true,
      createdAt: true,
    },
  })

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })

  return { user, token }
}

describe('PATCH /auth/me', () => {
  beforeAll(async () => {
    // Clean up test users before tests run
    await prisma.user.deleteMany({
      where: { email: { contains: '@example.com' } },
    })
  })

  it('updates name and returns updated user', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/auth/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Name' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.name).toBe('New Name')
  })

  it('updates email and returns updated user', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/auth/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'new@example.com' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('new@example.com')
  })

  it('rejects email that is already taken', async () => {
    // Create a user with a specific "taken" email
    const takenEmail = `taken-${Date.now()}@example.com`
    await createTestUser({ email: takenEmail })

    // Create another user and get their token
    const { token } = await createTestUser()

    // Try to update to the taken email
    const res = await app.request('/auth/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: takenEmail }),
    })

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Email already in use')
  })

  it('rejects empty name', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/auth/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 401 without token', async () => {
    const res = await app.request('/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test' }),
    })

    expect(res.status).toBe(401)
  })
})

describe('POST /auth/change-password', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@example.com' } },
    })
  })

  it('changes password successfully', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword: 'password123', newPassword: 'newpassword123' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('rejects wrong current password', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' }),
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Current password is incorrect')
  })

  it('rejects new password shorter than 6 chars', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword: 'password123', newPassword: '12345' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Password must be at least 6 characters')
  })

  it('returns 401 without token', async () => {
    const res = await app.request('/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword: 'old', newPassword: 'newpassword' }),
    })
    expect(res.status).toBe(401)
  })
})