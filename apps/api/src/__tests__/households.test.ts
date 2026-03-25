import { describe, it, expect, beforeAll } from 'bun:test'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'
import app from '../index'

// Helper to create a test user
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

// Helper to create a test household with a user as member
async function createTestHousehold(data: { role?: 'OWNER' | 'ADMIN' | 'MEMBER' } = {}) {
  const role = data.role ?? 'OWNER'
  const { user, token } = await createTestUser()

  const household = await prisma.household.create({
    data: {
      name: 'Test Household',
      members: {
        create: {
          userId: user.id,
          role,
        },
      },
    },
  })

  // Update user's currentHouseholdId
  await prisma.user.update({
    where: { id: user.id },
    data: { currentHouseholdId: household.id },
  })

  return { user, token, householdId: household.id }
}

describe('PATCH /households/:householdId', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@example.com' } },
    })
  })

  it('updates household name as owner', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New House Name' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.household.name).toBe('New House Name')
  })

  it('updates household name as admin', async () => {
    const { token, householdId } = await createTestHousehold({ role: 'ADMIN' })

    const res = await app.request(`/households/${householdId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New House Name' }),
    })

    expect(res.status).toBe(200)
  })

  it('rejects update as member', async () => {
    const { token, householdId } = await createTestHousehold({ role: 'MEMBER' })

    const res = await app.request(`/households/${householdId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New House Name' }),
    })

    expect(res.status).toBe(403)
  })

  it('rejects name shorter than 2 chars', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'A' }),
    })

    expect(res.status).toBe(400)
  })
})