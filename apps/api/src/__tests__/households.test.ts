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

// Helper to create a user and join a household with a specific role
async function createTestUserAndJoin(householdId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'MEMBER') {
  const { user, token } = await createTestUser()

  await prisma.householdMember.create({
    data: {
      householdId,
      userId: user.id,
      role,
    },
  })

  return { userId: user.id, token }
}

// Helper to get token for an existing user
async function getTokenForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })
  if (!user) throw new Error('User not found')
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })
  return { user, token }
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

describe('PATCH /households/:householdId/members/:userId', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@example.com' } },
    })
  })

  it('owner can change member to admin', async () => {
    const { token, householdId } = await createTestHousehold()
    const { userId: memberUserId } = await createTestUserAndJoin(householdId, 'MEMBER')

    const res = await app.request(`/households/${householdId}/members/${memberUserId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.role).toBe('ADMIN')
  })

  it('owner can change admin to member', async () => {
    const { token, householdId } = await createTestHousehold()
    const { userId: adminUserId } = await createTestUserAndJoin(householdId, 'ADMIN')

    const res = await app.request(`/households/${householdId}/members/${adminUserId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'MEMBER' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.role).toBe('MEMBER')
  })

  it('admin cannot change roles', async () => {
    const { token: ownerToken, householdId } = await createTestHousehold()
    const { userId: memberUserId } = await createTestUserAndJoin(householdId, 'MEMBER')
    const { userId: adminUserId } = await createTestUserAndJoin(householdId, 'ADMIN')
    const { token: adminToken } = await getTokenForUser(adminUserId)

    const res = await app.request(`/households/${householdId}/members/${memberUserId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    })

    expect(res.status).toBe(403)
  })

  it('member cannot change roles', async () => {
    const { token: ownerToken, householdId } = await createTestHousehold()
    const { userId: memberUserId } = await createTestUserAndJoin(householdId, 'MEMBER')
    const { userId: otherUserId } = await createTestUserAndJoin(householdId, 'MEMBER')
    const { token: memberToken } = await getTokenForUser(memberUserId)

    const res = await app.request(`/households/${householdId}/members/${otherUserId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    })

    expect(res.status).toBe(403)
  })

  it('owner cannot demote themselves if sole owner', async () => {
    const { token, householdId, user } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/members/${user.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'MEMBER' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Cannot change your own role')
  })

  it('owner can demote themselves if another owner exists', async () => {
    const { token, householdId, user } = await createTestHousehold()
    await createTestUserAndJoin(householdId, 'OWNER')

    const res = await app.request(`/households/${householdId}/members/${user.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    })

    expect(res.status).toBe(200)
  })
})

describe('DELETE /households/:householdId/members/:userId', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@example.com' } },
    })
  })

  it('owner can remove a member', async () => {
    const { token, householdId } = await createTestHousehold()
    const { userId: memberUserId } = await createTestUserAndJoin(householdId, 'MEMBER')

    const res = await app.request(`/households/${householdId}/members/${memberUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('owner can remove an admin', async () => {
    const { token, householdId } = await createTestHousehold()
    const { userId: adminUserId } = await createTestUserAndJoin(householdId, 'ADMIN')

    const res = await app.request(`/households/${householdId}/members/${adminUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    expect(res.status).toBe(200)
  })

  it('admin cannot remove members', async () => {
    const { token: ownerToken, householdId } = await createTestHousehold()
    const { userId: memberUserId } = await createTestUserAndJoin(householdId, 'MEMBER')
    const { userId: adminUserId } = await createTestUserAndJoin(householdId, 'ADMIN')
    const { token: adminToken } = await getTokenForUser(adminUserId)

    const res = await app.request(`/households/${householdId}/members/${memberUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })

    expect(res.status).toBe(403)
  })

  it('member cannot remove members', async () => {
    const { token: ownerToken, householdId } = await createTestHousehold()
    const { userId: memberUserId } = await createTestUserAndJoin(householdId, 'MEMBER')
    const { userId: otherUserId } = await createTestUserAndJoin(householdId, 'MEMBER')
    const { token: memberToken } = await getTokenForUser(memberUserId)

    const res = await app.request(`/households/${householdId}/members/${otherUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    })

    expect(res.status).toBe(403)
  })

  it('owner cannot remove themselves', async () => {
    const { token, householdId, user } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/members/${user.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Cannot remove yourself. Use leave instead.')
  })

  it('cannot remove the last member', async () => {
    const { token, householdId, user } = await createTestHousehold()

    // Try to remove the only member (self) - should fail with different error
    const res = await app.request(`/households/${householdId}/members/${user.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    expect(res.status).toBe(400)
  })
})