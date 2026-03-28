import { describe, it, expect, afterEach } from 'vitest'
import { cleanupAllTestData } from './helpers'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'
import app from '../index'

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

  return { user }
}

describe('POST /auth/login - returns both tokens', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('login returns accessToken and refreshToken', async () => {
    const { user } = await createTestUser({ email: 'login@example.com' })
    await bcrypt.hash('password123', 10) // ensure password is set

    // Create user with known password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'password123' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeDefined()
    expect(body.user).toBeDefined()
    expect(body.user.password).toBeUndefined()

    // Verify tokens are different types
    const accessPayload = jwt.verify(body.accessToken, JWT_SECRET) as { sub: string; type: string }
    const refreshPayload = jwt.verify(body.refreshToken, JWT_SECRET) as { sub: string; type: string; jti: string }

    expect(accessPayload.type).toBe('access')
    expect(refreshPayload.type).toBe('refresh')
    expect(accessPayload.sub).toBe(user.id)
    expect(refreshPayload.sub).toBe(user.id)
  })

  it('refresh token is stored in database', async () => {
    const { user } = await createTestUser({ email: 'login2@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login2@example.com', password: 'password123' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()

    // Check refresh token is in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: body.refreshToken },
    })

    expect(storedToken).not.toBeNull()
    expect(storedToken?.userId).toBe(user.id)
  })
})

describe('POST /auth/register - returns both tokens', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('register returns accessToken and refreshToken', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeDefined()
    expect(body.user.email).toBe('newuser@example.com')

    // Verify token types
    const accessPayload = jwt.verify(body.accessToken, JWT_SECRET) as { sub: string; type: string }
    const refreshPayload = jwt.verify(body.refreshToken, JWT_SECRET) as { sub: string; type: string }

    expect(accessPayload.type).toBe('access')
    expect(refreshPayload.type).toBe('refresh')
  })
})

describe('POST /auth/refresh', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('refresh with valid token returns new tokens', async () => {
    // Create user and login to get tokens
    const { user } = await createTestUser({ email: 'refresh@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'refresh@example.com', password: 'password123' }),
    })

    const { refreshToken: oldRefreshToken } = await loginRes.json()

    // Refresh
    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldRefreshToken }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeDefined()
    expect(body.refreshToken).not.toBe(oldRefreshToken) // Should be a new token

    // Old token should be invalidated
    const oldTokenInDb = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    })
    expect(oldTokenInDb).toBeNull()
  })

  it('refresh with expired/invalid token returns 401', async () => {
    const fakeToken = jwt.sign({ sub: 'fake', type: 'refresh' }, JWT_SECRET, { expiresIn: '-1h' })

    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: fakeToken }),
    })

    expect(res.status).toBe(401)
  })

  it('refresh with token not in database returns 401', async () => {
    // Create a valid JWT but don't store it in DB
    const { user } = await createTestUser({ email: 'notinDB@example.com' })
    const orphanToken = jwt.sign({ sub: user.id, type: 'refresh', jti: 'orphan' }, JWT_SECRET, { expiresIn: '7d' })

    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: orphanToken }),
    })

    expect(res.status).toBe(401)
  })

  it("can't use refresh token twice", async () => {
    // Create user and login
    const { user } = await createTestUser({ email: 'reuse@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reuse@example.com', password: 'password123' }),
    })

    const { refreshToken } = await loginRes.json()

    // First refresh should work
    const res1 = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(res1.status).toBe(200)

    // Second refresh with same token should fail (token was deleted)
    const res2 = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(res2.status).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('logout invalidates refresh token', async () => {
    // Create user and login
    const { user } = await createTestUser({ email: 'logout@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'logout@example.com', password: 'password123' }),
    })

    const { refreshToken, accessToken } = await loginRes.json()

    // Logout
    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    expect(logoutRes.status).toBe(200)

    // Refresh token should be deleted from DB
    const tokenInDb = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })
    expect(tokenInDb).toBeNull()

    // Should not be able to refresh with logged out token
    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(refreshRes.status).toBe(401)
  })
})
