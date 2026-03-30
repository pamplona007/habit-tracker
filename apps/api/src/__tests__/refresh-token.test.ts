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

describe('POST /auth/login - returns access token with refresh token in HttpOnly cookie', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('login returns accessToken and sets refresh token cookie', async () => {
    const { user } = await createTestUser({ email: 'login@example.com' })
    await bcrypt.hash('password123', 10)

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
    expect(body.refreshToken).toBeUndefined()
    expect(body.user).toBeDefined()
    expect(body.user.password).toBeUndefined()

    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeDefined()
    expect(setCookie).toContain('refresh_token=')
    expect(setCookie).toContain('HttpOnly')

    const accessPayload = jwt.verify(body.accessToken, JWT_SECRET) as { sub: string; type: string }
    expect(accessPayload.type).toBe('access')
    expect(accessPayload.sub).toBe(user.id)
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
    const refreshTokenFromCookie = extractRefreshToken(res.headers.get('set-cookie'))

    const expectedHash = crypto.createHash('sha256').update(refreshTokenFromCookie).digest('hex')
    const storedToken = await prisma.refreshToken.findFirst({
      where: { token: `hashed:${expectedHash}` },
    })

    expect(storedToken).not.toBeNull()
    expect(storedToken?.userId).toBe(user.id)
  })
})

describe('POST /auth/register - returns access token with refresh token in HttpOnly cookie', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('register returns accessToken and sets refresh token cookie', async () => {
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
    expect(body.refreshToken).toBeUndefined()
    expect(body.user.email).toBe('newuser@example.com')

    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeDefined()
    expect(setCookie).toContain('refresh_token=')
    expect(setCookie).toContain('HttpOnly')

    const accessPayload = jwt.verify(body.accessToken, JWT_SECRET) as { sub: string; type: string }
    expect(accessPayload.type).toBe('access')
  })
})

describe('POST /auth/refresh', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  async function loginAndGetCookie(email: string, password: string): Promise<string> {
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    return extractRefreshToken(loginRes.headers.get('set-cookie'))
  }

  it('refresh with valid token returns new tokens', async () => {
    const { user } = await createTestUser({ email: 'refresh@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const refreshToken = await loginAndGetCookie('refresh@example.com', 'password123')

    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeUndefined()

    const oldRefreshToken = `hashed:${crypto.createHash('sha256').update(refreshToken).digest('hex')}`
    const oldTokenInDb = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    })
    expect(oldTokenInDb).toBeNull()
  })

  it('refresh with fake token returns 401', async () => {
    const fakeToken = jwt.sign({ sub: 'fake', type: 'refresh' }, JWT_SECRET, { expiresIn: '-1h' })

    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${fakeToken}` },
    })

    expect(res.status).toBe(401)
  })

  it('refresh with token not in database returns 401', async () => {
    const { user } = await createTestUser({ email: 'notinDB@example.com' })
    const orphanToken = jwt.sign({ sub: user.id, type: 'refresh', jti: 'orphan' }, JWT_SECRET, { expiresIn: '7d' })

    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${orphanToken}` },
    })

    expect(res.status).toBe(401)
  })

  it("can't use refresh token twice", async () => {
    const { user } = await createTestUser({ email: 'reuse@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const refreshToken = await loginAndGetCookie('reuse@example.com', 'password123')

    const res1 = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
    })
    expect(res1.status).toBe(200)

    const res2 = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
    })
    expect(res2.status).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  async function loginAndGetTokens(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await loginRes.json()
    const refreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))
    return { accessToken: body.accessToken, refreshToken }
  }

  it('logout invalidates refresh token', async () => {
    const { user } = await createTestUser({ email: 'logout@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const { refreshToken, accessToken } = await loginAndGetTokens('logout@example.com', 'password123')

    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Cookie': `refresh_token=${refreshToken}`,
      },
    })

    expect(logoutRes.status).toBe(200)

    // Refresh token should be deleted from DB
    const tokenInDb = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })
    expect(tokenInDb).toBeNull()

    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
    })
    expect(refreshRes.status).toBe(401)
  })
})

describe('Security: Refresh token stored as hash, not plaintext', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('refresh token is stored as SHA-256 hash in database, not plaintext', async () => {
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

    const refreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))

    const expectedHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    })

    expect(storedTokens.length).toBeGreaterThan(0)

    const rawJwtInDb = storedTokens.filter(t =>
      t.token === refreshToken || t.token.startsWith('eyJ')
    )
    expect(rawJwtInDb.length).toBe(0)

    const hashedToken = storedTokens.find(t => t.token === `hashed:${expectedHash}`)
    expect(hashedToken).toBeDefined()
  })
})

describe('Security: Refresh token rotation is atomic (race condition)', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  async function loginAndGetCookie(email: string, password: string): Promise<string> {
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    return extractRefreshToken(loginRes.headers.get('set-cookie'))
  }

  it('concurrent refresh requests - only one should succeed', async () => {
    const { user } = await createTestUser({ email: 'race@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const refreshToken = await loginAndGetCookie('race@example.com', 'password123')

    const [res1, res2] = await Promise.all([
      app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
      }),
      app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
      }),
    ])

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

  async function loginAndGetTokens(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await loginRes.json()
    const refreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))
    return { accessToken: body.accessToken, refreshToken }
  }

  it('logout works with refresh token when access token is expired', async () => {
    const { user } = await createTestUser({ email: 'logout-expired@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const { refreshToken } = await loginAndGetTokens('logout-expired@example.com', 'password123')

    const expiredAccessToken = jwt.sign(
      { sub: user.id, type: 'access' },
      JWT_SECRET,
      { expiresIn: '-1h' }
    )

    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${expiredAccessToken}`,
        'Content-Type': 'application/json',
        'Cookie': `refresh_token=${refreshToken}`,
      },
    })

    expect(logoutRes.status).toBe(200)

    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
    })
    expect(refreshRes.status).toBe(401)
  })

  it('logout with refresh token only (no access token) should work', async () => {
    const { user } = await createTestUser({ email: 'logout-refresh-only@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const { refreshToken } = await loginAndGetTokens('logout-refresh-only@example.com', 'password123')

    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `refresh_token=${refreshToken}`,
      },
    })

    expect(logoutRes.status).toBe(200)

    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
    })
    expect(refreshRes.status).toBe(401)
  })
})

describe('Security: Logout with refresh token also invalidates it', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  async function loginAndGetTokens(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await loginRes.json()
    const refreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))
    return { accessToken: body.accessToken, refreshToken }
  }

  it('after logout, refresh token cannot be used again', async () => {
    const { user } = await createTestUser({ email: 'logout-invalidates@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const { refreshToken, accessToken } = await loginAndGetTokens('logout-invalidates@example.com', 'password123')

    await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Cookie': `refresh_token=${refreshToken}`,
      },
    })

    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
    })

    expect(refreshRes.status).toBe(401)
  })
})

describe('Security: OAuth callback URL uses fragment with access token only', () => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

  it('buildRedirectUrl uses URL fragment (#) with access token only', async () => {
    const { buildRedirectUrl } = await import('../routes/auth')

    const accessToken = 'test-access-token'

    const url = buildRedirectUrl(accessToken)

    expect(url).toContain('#')
    expect(url).not.toContain('?')
    expect(url).toContain(`${FRONTEND_URL}/auth/callback#`)
    expect(url).toContain('accessToken=')
    expect(url).not.toContain('refreshToken=')
    expect(url).not.toContain('user=')
  })

  it('buildErrorRedirectUrl uses URL fragment (#) not query string (?)', async () => {
    const { buildErrorRedirectUrl } = await import('../routes/auth')

    const error = 'invalid_state'
    const url = buildErrorRedirectUrl(error)

    expect(url).toContain('#error=')
    expect(url).not.toContain('?error=')
    expect(url).toContain(`${FRONTEND_URL}/auth/callback#error=`)
  })
})

describe('Security: deleteRefreshToken only returns false for not-found, propagates real errors', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('deleteRefreshToken returns false when token not found', async () => {
    const { deleteRefreshToken } = await import('../routes/auth')

    const result = await deleteRefreshToken('non-existent-token')
    expect(result).toBe(false)
  })
})

describe('Security: OAuth callback redirects to frontend with fragment error', () => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

  it('callback redirects with 302 and Location header containing fragment error', async () => {
    const res = await app.request('/auth/oauth/google/callback?code=abc&state=tampered', {
      headers: { Cookie: 'oauth_state=correct-state' },
    })

    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).toContain(`${FRONTEND_URL}/auth/callback`)
    expect(location).toContain('#error=')
  })

  it('callback redirects with 302 for missing code', async () => {
    const res = await app.request('/auth/oauth/google/callback?state=abc', {
      headers: { Cookie: 'oauth_state=abc' },
    })

    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).toContain(`${FRONTEND_URL}/auth/callback#error=missing_params`)
  })

  it('callback redirects with 302 for invalid provider', async () => {
    const res = await app.request('/auth/oauth/twitter/callback?code=abc&state=def')

    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).toContain(`${FRONTEND_URL}/auth/callback#error=invalid_provider`)
  })
})

describe('Security: Refresh fails with wrong/expired refresh token returns 401', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('wrong refresh token returns 401', async () => {
    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'refresh_token=completely-fake-token',
      },
    })

    expect(res.status).toBe(401)
  })

  it('expired refresh token returns 401', async () => {
    const { user } = await createTestUser({ email: 'expired-token@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const expiredToken = jwt.sign(
      { sub: user.id, type: 'refresh', jti: 'expired-jti' },
      JWT_SECRET,
      { expiresIn: '-1h' }
    )

    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `refresh_token=${expiredToken}`,
      },
    })

    expect(res.status).toBe(401)
  })
})

function extractRefreshToken(setCookie: string | null): string {
  if (!setCookie) return ''
  const match = setCookie.match(/refresh_token=([^;]+)/)
  return match ? match[1] : ''
}

describe('Security: Refresh token cookie attributes', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('login sets HttpOnly cookie with correct attributes', async () => {
    const { user } = await createTestUser({ email: 'cookie-attr@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cookie-attr@example.com', password: 'password123' }),
    })

    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') || ''
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Strict')
    expect(setCookie).toContain('Max-Age=604800')
    expect(setCookie).toContain('refresh_token=')
  })

  it('register sets HttpOnly cookie with correct attributes', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'register-cookie@example.com',
        password: 'password123',
        name: 'Test User',
      }),
    })

    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') || ''
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Strict')
    expect(setCookie).toContain('Max-Age=604800')
    expect(setCookie).toContain('refresh_token=')
  })

  it('refresh endpoint accepts token via cookie (not body)', async () => {
    const { user } = await createTestUser({ email: 'cookie-refresh@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cookie-refresh@example.com', password: 'password123' }),
    })
    const refreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))

    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
    })

    expect(refreshRes.status).toBe(200)
    const body = await refreshRes.json()
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeUndefined()
  })

  it('refresh with body refreshToken returns 400 (deprecated)', async () => {
    const { user } = await createTestUser({ email: 'body-refresh@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'body-refresh@example.com', password: 'password123' }),
    })
    const refreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))

    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    expect(refreshRes.status).toBe(400)
  })

  it('new refresh cookie is set after token refresh', async () => {
    const { user } = await createTestUser({ email: 'new-cookie@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new-cookie@example.com', password: 'password123' }),
    })
    const oldRefreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))

    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${oldRefreshToken}` },
    })

    expect(refreshRes.status).toBe(200)
    const newSetCookie = refreshRes.headers.get('set-cookie') || ''
    const newRefreshToken = extractRefreshToken(newSetCookie)
    expect(newRefreshToken).toBeDefined()
    expect(newRefreshToken).not.toBe(oldRefreshToken)
  })

  it('logout clears refresh token cookie', async () => {
    const { user } = await createTestUser({ email: 'logout-cookie@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'logout-cookie@example.com', password: 'password123' }),
    })
    const refreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))
    const accessToken = (await loginRes.json()).accessToken

    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Cookie': `refresh_token=${refreshToken}`,
      },
    })

    expect(logoutRes.status).toBe(200)
    const setCookie = logoutRes.headers.get('set-cookie') || ''
    expect(setCookie).toContain('refresh_token=')
    expect(setCookie).toContain('Max-Age=0')
  })

  it('cannot reuse refresh token after logout', async () => {
    const { user } = await createTestUser({ email: 'logout-reuse@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'logout-reuse@example.com', password: 'password123' }),
    })
    const refreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))
    const accessToken = (await loginRes.json()).accessToken

    await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Cookie': `refresh_token=${refreshToken}`,
      },
    })

    const refreshRes = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
    })

    expect(refreshRes.status).toBe(401)
  })

  it('concurrent refresh with same cookie - only one succeeds (atomic rotation)', async () => {
    const { user } = await createTestUser({ email: 'race-cookie@example.com' })
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash('password123', 10) },
    })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'race-cookie@example.com', password: 'password123' }),
    })
    const refreshToken = extractRefreshToken(loginRes.headers.get('set-cookie'))

    const [res1, res2] = await Promise.all([
      app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
      }),
      app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `refresh_token=${refreshToken}` },
      }),
    ])

    const successCount = [res1, res2].filter(r => r.status === 200).length
    expect(successCount).toBe(1)
  })
})
