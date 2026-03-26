import { describe, it, expect, afterEach, beforeEach } from 'vitest'
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

async function createTestUserAndJoin(householdId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'MEMBER') {
  const { user, token } = await createTestUser()
  await prisma.householdMember.create({ data: { householdId, userId: user.id, role } })
  return { userId: user.id, token, householdId }
}

async function createTestHousehold(data: { role?: 'OWNER' | 'ADMIN' | 'MEMBER'; name?: string } = {}) {
  const role = data.role ?? 'OWNER'
  const { user, token } = await createTestUser()
  const household = await prisma.household.create({
    data: {
      name: data.name ?? 'Test Household',
      members: { create: { userId: user.id, role } },
    },
  })
  await prisma.user.update({ where: { id: user.id }, data: { currentHouseholdId: household.id } })
  return { user, token, householdId: household.id }
}

async function createInviteForHousehold(householdId: string) {
  const code = Math.random().toString(36).substring(2, 14).toUpperCase()
  return prisma.householdInvite.create({
    data: { code, householdId, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  })
}

describe('POST /households', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('creates a household and sets it as active', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/households', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My New House' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.household.name).toBe('My New House')
    expect(body.household.members).toBeDefined()
    expect(body.household.members[0].role).toBe('OWNER')
  })

  it('rejects name shorter than 2 chars', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/households', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('min 2 chars')
  })

  it('rejects missing name', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/households', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
  })

  it('rejects unauthenticated request', async () => {
    const res = await app.request('/households', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test House' }),
    })

    expect(res.status).toBe(401)
  })
})

describe('GET /households', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('lists households the user is a member of', async () => {
    const { token, householdId } = await createTestHousehold({ name: 'User House' })

    const res = await app.request('/households', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.households.length).toBeGreaterThanOrEqual(1)
    expect(body.households[0].id).toBe(householdId)
  })

  it('returns empty list for user with no households', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/households', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.households).toEqual([])
  })
})

describe('POST /households/join', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('joins a household with valid invite code', async () => {
    const { token, householdId } = await createTestHousehold()
    const invite = await createInviteForHousehold(householdId)
    const { token: joinerToken } = await createTestUser({ email: 'joiner@example.com' })

    const res = await app.request('/households/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${joinerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: invite.code }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.household.id).toBe(householdId)
  })

  it('rejects invalid invite code', async () => {
    const { token } = await createTestUser({ email: 'joiner2@example.com' })

    const res = await app.request('/households/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'INVALIDCODE' }),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Invalid invite code')
  })

  it('rejects already-used invite code', async () => {
    const { token, householdId } = await createTestHousehold()
    const invite = await createInviteForHousehold(householdId)
    const { token: joinerToken, user: joiner } = await createTestUser({ email: 'joiner3@example.com' })

    await app.request('/households/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${joinerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: invite.code }),
    })

    const { token: otherToken } = await createTestUser({ email: 'other@example.com' })
    const res = await app.request('/households/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: invite.code }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('This invite has already been used')
  })

  it('rejects expired invite code', async () => {
    const { householdId } = await createTestHousehold()
    const expiredInvite = await prisma.householdInvite.create({
      data: {
        code: 'EXPIRED1',
        householdId,
        expiresAt: new Date(Date.now() - 1000),
      },
    })
    const { token } = await createTestUser({ email: 'expired@example.com' })

    const res = await app.request('/households/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'EXPIRED1' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('This invite has expired')
  })

  it('rejects missing invite code', async () => {
    const { token } = await createTestUser()

    const res = await app.request('/households/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invite code is required')
  })
})

describe('GET /households/:householdId', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('returns household details for member', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.household.id).toBe(householdId)
    expect(body.household.members).toBeDefined()
    expect(body.household.invites).toBeDefined()
  })

  it('returns 403 for non-member', async () => {
    const { householdId } = await createTestHousehold()
    const { token } = await createTestUser({ email: 'outsider@example.com' })

    const res = await app.request(`/households/${householdId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(403)
  })
})

describe('POST /households/:householdId/invites', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('generates an invite code', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.invite.code).toBeDefined()
    expect(body.invite.expiresAt).toBeDefined()
  })

  it('respects custom expiresInHours', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresInHours: 48 }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    const expiresAt = new Date(body.invite.expiresAt)
    const diffHours = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
    expect(diffHours).toBeGreaterThan(47)
    expect(diffHours).toBeLessThan(49)
  })

  it('returns 403 for non-member', async () => {
    const { householdId } = await createTestHousehold()
    const { token } = await createTestUser({ email: 'outsider@example.com' })

    const res = await app.request(`/households/${householdId}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(403)
  })
})

describe('POST /households/:householdId/switch', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('switches active household', async () => {
    const { token: token1, householdId: hh1 } = await createTestHousehold({ name: 'House 1' })
    const { token: token2, householdId: hh2 } = await createTestUserAndJoin(hh1, 'MEMBER')

    const res = await app.request(`/households/${hh2}/switch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 403 for non-member', async () => {
    const { householdId } = await createTestHousehold()
    const { token } = await createTestUser({ email: 'outsider@example.com' })

    const res = await app.request(`/households/${householdId}/switch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(403)
  })
})

describe('POST /households/:householdId/leave', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('member can leave a household', async () => {
    const { token: ownerToken, householdId } = await createTestHousehold()
    const { userId, token: memberToken } = await createTestUserAndJoin(householdId, 'MEMBER')

    const res = await app.request(`/households/${householdId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('cannot leave as the only member', async () => {
    const { token, householdId } = await createTestHousehold()

    const res = await app.request(`/households/${householdId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('only member')
  })

  it('returns 403 for non-member', async () => {
    const { householdId } = await createTestHousehold()
    const { token } = await createTestUser({ email: 'outsider@example.com' })

    const res = await app.request(`/households/${householdId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(403)
  })
})
