import { describe, it, expect, afterEach } from 'vitest'
import { cleanupAllTestData } from './helpers'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'
import app from '../index'
import crypto from 'crypto'

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

  it('refresh token is stored in database (hashed)', async () => {
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

    // Check refresh token hash is in DB
    const expectedHash = crypto.createHash('sha256').update(body.refreshToken).digest('hex')
    const storedToken = await prisma.refreshToken.findFirst({
      where: { token: `hashed:${expectedHash}` },
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

    // Old token should be invalidated (token is stored as hashed:)
    const oldHashedToken = `hashed:${crypto.createHash('sha256').update(oldRefreshToken).digest('hex')}`
    const oldTokenInDb = await prisma.refreshToken.findUnique({
      where: { token: oldHashedToken },
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

    // Refresh token should be deleted from DB (token is stored as hashed:)
    const hashedToken = `hashed:${crypto.createHash('sha256').update(refreshToken).digest('hex')}`
    const tokenInDb = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
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

// ============================================
// NEW SECURITY TESTS
// ============================================

describe('Security: Refresh token stored as hash, not plaintext', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('refresh token is stored as SHA-256 hash in database, not plaintext', async () => {
    // Create user and login
    const { user } = await createTestUser({ email: 'hash-test@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hash-test@example.com', password: 'password123' }),
    })

    const { refreshToken } = await loginRes.json()

    // Calculate what the hash should be
    const expectedHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

    // Find all refresh tokens for this user
    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    })

    expect(storedTokens.length).toBeGreaterThan(0)

    // The raw token should NOT be stored directly
    // Check that no token equals the raw refreshToken and no token starts with 'eyJ' (unhashed JWT prefix)
    const rawJwtInDb = storedTokens.filter(t =>
      t.token === refreshToken || t.token.startsWith('eyJ')
    )
    expect(rawJwtInDb.length).toBe(0)

    // The hashed token should be stored with prefix 'hashed:'
    const hashedToken = storedTokens.find(t => t.token === `hashed:${expectedHash}`)
    expect(hashedToken).toBeDefined()
  })
})

describe('Security: Refresh token rotation is atomic (race condition)', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('concurrent refresh requests - only one should succeed', async () => {
    // Create user and login
    const { user } = await createTestUser({ email: 'race@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'race@example.com', password: 'password123' }),
    })

    const { refreshToken } = await loginRes.json()

    // Simulate concurrent refresh requests
    const [res1, res2] = await Promise.all([
      app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }),
      app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }),
    ])

    // One should succeed, one should fail
    const successCount = [res1, res2].filter(r => r.status === 200).length
    const failCount = [res1, res2].filter(r => r.status === 401).length

    expect(successCount).toBe(1)
    expect(failCount).toBe(1)
  })
})

describe('Security: Logout with expired access token (using refresh token)', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('logout works with refresh token when access token is expired', async () => {
    // Create user and login
    const { user } = await createTestUser({ email: 'logout-expired@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'logout-expired@example.com', password: 'password123' }),
    })

    const { refreshToken } = await loginRes.json()

    // Create an expired access token
    const expiredAccessToken = jwt.sign(
      { sub: user.id, type: 'access' },
      JWT_SECRET,
      { expiresIn: '-1h' } // Already expired
    )

    // Logout should work with just the refresh token
    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${expiredAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    expect(logoutRes.status).toBe(200)

    // Refresh token should be invalidated
    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(refreshRes.status).toBe(401)
  })

  it('logout with refresh token only (no access token) should work', async () => {
    // Create user and login
    const { user } = await createTestUser({ email: 'logout-refresh-only@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'logout-refresh-only@example.com', password: 'password123' }),
    })

    const { refreshToken } = await loginRes.json()

    // Logout with just refresh token (no Authorization header)
    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    expect(logoutRes.status).toBe(200)

    // Refresh token should be invalidated
    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(refreshRes.status).toBe(401)
  })
})

describe('Security: Logout with refresh token also invalidates it', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('after logout, refresh token cannot be used again', async () => {
    // Create user and login
    const { user } = await createTestUser({ email: 'logout-invalidates@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'logout-invalidates@example.com', password: 'password123' }),
    })

    const { refreshToken, accessToken } = await loginRes.json()

    // Logout
    await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    // Try to use the refresh token again - should fail
    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    expect(refreshRes.status).toBe(401)
  })
})

describe('Security: OAuth callback URL uses fragment, not query string', () => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

  it('buildRedirectUrl uses URL fragment (#) not query string (?)', async () => {
    // Import the actual function
    const { buildRedirectUrl } = await import('../routes/auth')

    const accessToken = 'test-access-token'
    const refreshToken = 'test-refresh-token'
    const user = { id: '123', email: 'test@example.com' }

    const url = buildRedirectUrl(accessToken, refreshToken, user)

    // Should use fragment (#), not query string (?)
    expect(url).toContain('#')
    expect(url).not.toContain('?')
    expect(url).toContain(`${FRONTEND_URL}/auth/callback#`)
  })

  it('buildErrorRedirectUrl uses URL fragment (#) not query string (?)', async () => {
    // Import the actual function
    const { buildErrorRedirectUrl } = await import('../routes/auth')

    const error = 'invalid_state'
    const url = buildErrorRedirectUrl(error)

    // Should use fragment (#), not query string (?)
    expect(url).toContain('#error=')
    expect(url).not.toContain('?error=')
    expect(url).toContain(`${FRONTEND_URL}/auth/callback#error=`)
  })
})

describe('Security: Refresh fails with wrong/expired refresh token returns 401', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('wrong refresh token returns 401', async () => {
    // Create user and login
    const { user } = await createTestUser({ email: 'wrong-token@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    // Try to refresh with a completely fake token
    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'completely-fake-token' }),
    })

    expect(res.status).toBe(401)
  })

  it('expired refresh token returns 401', async () => {
    // Create user
    const { user } = await createTestUser({ email: 'expired-token@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    // Create an already expired token
    const expiredToken = jwt.sign(
      { sub: user.id, type: 'refresh', jti: 'expired-jti' },
      JWT_SECRET,
      { expiresIn: '-1h' }
    )

    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: expiredToken }),
    })

    expect(res.status).toBe(401)
  })
})
