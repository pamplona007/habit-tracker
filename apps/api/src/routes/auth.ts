import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { JWT_SECRET, jwtMiddleware, loadUser } from '../middleware/auth'
import type { AppBindings } from '../types'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const API_URL = process.env.API_URL || 'http://localhost:3000'

const STATE_COOKIE = 'oauth_state'
const STATE_MAX_AGE = 60 * 5

function generateState(userId?: string): string {
  const uuid = crypto.randomUUID() + crypto.randomUUID()
  if (userId) {
    return Buffer.from(`${uuid}:${userId}`).toString('base64url')
  }
  return Buffer.from(uuid).toString('base64url')
}

function parseState(state: string): { userId?: string; uuid: string } {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8')
    const idx = decoded.indexOf(':')
    if (idx === -1) return { uuid: decoded }
    return { uuid: decoded.slice(0, idx), userId: decoded.slice(idx + 1) }
  } catch {
    return { uuid: state }
  }
}

// FIX #1: Use URL fragment (#) instead of query string (?) to prevent refresh token leakage
// Fragments are not sent in HTTP requests, browser history, or Referer headers
export function buildRedirectUrl(accessToken: string, refreshToken: string, user: unknown): string {
  const params = new URLSearchParams({ accessToken, refreshToken, user: JSON.stringify(user) })
  return `${FRONTEND_URL}/auth/callback#${params}`
}

// FIX #3: Use URL fragment (#) for errors too, not just query string (?)
// This prevents error messages from being sent to servers in Referer headers
export function buildErrorRedirectUrl(error: string): string {
  return `${FRONTEND_URL}/auth/callback#error=${encodeURIComponent(error)}`
}

// FIX #2: Hash refresh tokens before storing in DB for security
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function createRefreshToken(userId: string): Promise<string> {
  const id = crypto.randomUUID()
  const token = jwt.sign({ sub: userId, type: 'refresh', jti: id }, JWT_SECRET, { expiresIn: '7d' })

  // Decode to get expiration
  const decoded = jwt.decode(token) as { exp: number }
  const expiresAt = new Date(decoded.exp * 1000)

  // Store hash of token in DB, not the raw token
  const tokenHash = hashToken(token)

  await prisma.refreshToken.create({
    data: {
      id,
      token: `hashed:${tokenHash}`, // Prefix to identify hashed tokens
      userId,
      expiresAt,
    },
  })

  return token
}

async function validateRefreshToken(token: string): Promise<string | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; type: string; jti: string }

    if (payload.type !== 'refresh') {
      return null
    }

    const tokenHash = hashToken(token)

    // Find token by hash
    const storedToken = await prisma.refreshToken.findFirst({
      where: { token: `hashed:${tokenHash}` },
    })

    if (!storedToken) {
      return null
    }

    // Check if expired
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } })
      return null
    }

    return payload.sub
  } catch {
    return null
  }
}

async function deleteRefreshToken(token: string): Promise<boolean> {
  // FIX #5: Let real DB errors propagate - deleteMany returns { count: 0 } when no match, not an error
  const tokenHash = hashToken(token)
  const result = await prisma.refreshToken.deleteMany({
    where: { token: `hashed:${tokenHash}` },
  })
  return result.count > 0
}

function createAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access' }, JWT_SECRET, { expiresIn: '15m' })
}

export const authRoutes = new Hono<AppBindings>()

authRoutes.get('/oauth/:provider', async (c) => {
  const provider = c.req.param('provider')

  if (provider !== 'google' && provider !== 'github') {
    return c.json({ error: 'Invalid provider' }, 400)
  }

  const state = generateState()

  c.header('Set-Cookie', `${STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Max-Age=${STATE_MAX_AGE}; Path=/`)

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${API_URL}/auth/oauth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    })
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  }

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${API_URL}/auth/oauth/github/callback`,
    scope: 'user:email',
    state,
  })
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`)
})

authRoutes.get('/oauth/:provider/callback', async (c) => {
  const provider = c.req.param('provider')
  const { code, state, error } = c.req.query()

  if (provider !== 'google' && provider !== 'github') {
    return c.redirect(buildErrorRedirectUrl('invalid_provider'))
  }

  if (error) {
    return c.redirect(buildErrorRedirectUrl(error))
  }

  if (!code || !state) {
    return c.redirect(buildErrorRedirectUrl('missing_params'))
  }

  const cookieValue = getCookie(c, STATE_COOKIE)
  if (!cookieValue || cookieValue !== state) {
    return c.redirect(buildErrorRedirectUrl('invalid_state'))
  }

  let userInfo: { email: string; name?: string; id: string }

  if (provider === 'google') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${API_URL}/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return c.redirect(buildErrorRedirectUrl('token_exchange_failed'))
    }

    const tokenData = await tokenRes.json() as { access_token: string }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!userRes.ok) {
      return c.redirect(buildErrorRedirectUrl('user_info_failed'))
    }

    const googleUser = await userRes.json() as { email: string; name?: string; sub: string }
    userInfo = { email: googleUser.email, name: googleUser.name, id: googleUser.sub }

  } else if (provider === 'github') {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: `${API_URL}/auth/oauth/github/callback`,
      }),
    })

    if (!tokenRes.ok) {
      return c.redirect(buildErrorRedirectUrl('token_exchange_failed'))
    }

    const tokenData = await tokenRes.json() as { access_token: string }

    if (!tokenData.access_token) {
      return c.redirect(buildErrorRedirectUrl('token_exchange_failed'))
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github.v3+json' },
    })

    if (!userRes.ok) {
      return c.redirect(buildErrorRedirectUrl('user_info_failed'))
    }

    const githubUser = await userRes.json() as { email: string | null; name?: string; id: number }

    let email = githubUser.email
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github.v3+json' },
      })
      if (emailsRes.ok) {
        const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>
        const primary = emails.find(e => e.primary && e.verified)
        email = primary?.email ?? emails[0]?.email ?? null
      }
    }

    if (!email) {
      return c.redirect(buildErrorRedirectUrl('github_no_email'))
    }

    userInfo = { email, name: githubUser.name, id: String(githubUser.id) }

  } else {
    return c.redirect(buildErrorRedirectUrl('invalid_provider'))
  }

  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: userInfo.id } },
  })

  if (existingAccount) {
    const existingUser = await prisma.user.findUnique({
      where: { id: existingAccount.userId },
      include: {
        memberships: { include: { household: { select: { id: true, name: true } } } },
        accounts: true,
      },
    })
    if (!existingUser) {
      return c.redirect(buildErrorRedirectUrl('user_not_found'))
    }
    const accessToken = createAccessToken(existingUser.id)
    const refreshToken = await createRefreshToken(existingUser.id)
    const { password: _, ...userWithoutPassword } = existingUser
    return c.redirect(buildRedirectUrl(accessToken, refreshToken, userWithoutPassword))
  }

  const existingUserByEmail = await prisma.user.findUnique({
    where: { email: userInfo.email },
    include: {
      memberships: { include: { household: { select: { id: true, name: true } } } },
      accounts: true,
    },
  })

  let userId: string

  if (existingUserByEmail) {
    userId = existingUserByEmail.id
  } else {
    const newUser = await prisma.user.create({
      data: {
        email: userInfo.email,
        name: userInfo.name || null,
        password: '',
      },
    })
    userId = newUser.id
  }

  await prisma.account.create({
    data: {
      userId,
      provider,
      providerAccountId: userInfo.id,
    },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { household: { select: { id: true, name: true } } } }, accounts: true },
  })

  const accessToken = createAccessToken(userId)
  const refreshToken = await createRefreshToken(userId)
  const { password: _, ...userWithoutPassword } = user!
  return c.redirect(buildRedirectUrl(accessToken, refreshToken, userWithoutPassword))
})

authRoutes.post('/link-account', jwtMiddleware, loadUser, async (c) => {
  const { provider } = await c.req.json()

  if (provider !== 'google' && provider !== 'github') {
    return c.json({ error: 'Invalid provider' }, 400)
  }

  const existing = await prisma.account.findUnique({
    where: { provider_userId: { provider, userId: c.get('user').id } },
  })

  if (existing) {
    return c.json({ error: 'Account already linked' }, 409)
  }

  const state = generateState(c.get('user').id)
  c.header('Set-Cookie', `${STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Max-Age=${STATE_MAX_AGE}; Path=/`)

  const redirectUri = `${API_URL}/auth/oauth/${provider}/link-callback`

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    })
    return c.json({ redirectUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
  }

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'user:email',
    state,
  })
  return c.json({ redirectUrl: `https://github.com/login/oauth/authorize?${params}` })
})

authRoutes.get('/oauth/:provider/link-callback', async (c) => {
  const provider = c.req.param('provider')
  const { code, state, error } = c.req.query()

  if (error) {
    return c.redirect(`${FRONTEND_URL}/settings?oauth_error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return c.redirect(`${FRONTEND_URL}/settings?oauth_error=missing_params`)
  }

  const cookieValue = getCookie(c, STATE_COOKIE)
  if (!cookieValue || cookieValue !== state) {
    return c.redirect(`${FRONTEND_URL}/settings?oauth_error=invalid_state`)
  }

  const parsed = parseState(state)
  if (!parsed.userId) {
    return c.redirect(`${FRONTEND_URL}/settings?oauth_error=invalid_state`)
  }

  let providerAccountId: string

  if (provider === 'google') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${API_URL}/auth/oauth/google/link-callback`,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) {
      return c.redirect(`${FRONTEND_URL}/settings?oauth_error=token_exchange_failed`)
    }
    const tokenData = await tokenRes.json() as { access_token: string }
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (!userRes.ok) {
      return c.redirect(`${FRONTEND_URL}/settings?oauth_error=user_info_failed`)
    }
    const googleUser = await userRes.json() as { sub: string }
    providerAccountId = googleUser.sub
  } else if (provider === 'github') {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: `${API_URL}/auth/oauth/github/link-callback`,
      }),
    })
    if (!tokenRes.ok) {
      return c.redirect(`${FRONTEND_URL}/settings?oauth_error=token_exchange_failed`)
    }
    const tokenData = await tokenRes.json() as { access_token: string }
    if (!tokenData.access_token) {
      return c.redirect(`${FRONTEND_URL}/settings?oauth_error=token_exchange_failed`)
    }
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github.v3+json' },
    })
    if (!userRes.ok) {
      return c.redirect(`${FRONTEND_URL}/settings?oauth_error=user_info_failed`)
    }
    const githubUser = await userRes.json() as { id: number }
    providerAccountId = String(githubUser.id)
  } else {
    return c.redirect(`${FRONTEND_URL}/settings?oauth_error=invalid_provider`)
  }

  await prisma.account.create({
    data: {
      userId: parsed.userId,
      provider,
      providerAccountId,
    },
  })

  return c.redirect(`${FRONTEND_URL}/settings?oauth_linked=${provider}`)
})

authRoutes.post('/register', async (c) => {
  const { email, password, name } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400)
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return c.json({ error: 'Email already registered' }, 400)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      currentHouseholdId: true,
      createdAt: true,
    },
  })

  const accessToken = createAccessToken(user.id)
  const refreshToken = await createRefreshToken(user.id)

  return c.json({ accessToken, refreshToken, user })
})

authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      currentHouseholdId: true,
      memberships: {
        include: { household: { select: { id: true, name: true } } },
      },
      createdAt: true,
    },
  })

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const accessToken = createAccessToken(user.id)
  const refreshToken = await createRefreshToken(user.id)

  const { password: _, ...userWithoutPassword } = user

  return c.json({ accessToken, refreshToken, user: userWithoutPassword })
})

authRoutes.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json()

  if (!refreshToken) {
    return c.json({ error: 'Refresh token is required' }, 400)
  }

  const userId = await validateRefreshToken(refreshToken)

  if (!userId) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }

  // FIX #8: Atomic token rotation - use deleteMany and check affected rows
  // This prevents race conditions where two concurrent refresh requests both pass validation
  const deleted = await deleteRefreshToken(refreshToken)
  if (!deleted) {
    // Token was already used or invalidated by another request
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }

  // Issue new tokens only if deletion succeeded
  const newAccessToken = createAccessToken(userId)
  const newRefreshToken = await createRefreshToken(userId)

  return c.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
})

authRoutes.post('/logout', async (c) => {
  // FIX #4: Handle empty or invalid JSON body gracefully
  let body: { refreshToken?: string } = {}
  try {
    body = await c.req.json()
  } catch {
    // Empty or invalid JSON - that's ok, refreshToken is optional
  }
  const { refreshToken } = body

  // FIX #3: Allow logout with just refresh token (when access token is expired/invalid)
  // This prevents users from being stuck unable to logout when their access token expires
  if (refreshToken) {
    await deleteRefreshToken(refreshToken)
  }

  return c.json({ success: true })
})

authRoutes.get('/me', jwtMiddleware, loadUser, async (c) => {
  const user = c.get('user')

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      currentHouseholdId: true,
      memberships: {
        include: { household: { select: { id: true, name: true } } },
      },
      accounts: { select: { id: true, provider: true, providerAccountId: true } },
      createdAt: true,
    },
  })

  return c.json({ user: fullUser })
})

authRoutes.patch('/me', jwtMiddleware, loadUser, async (c) => {
  const user = c.get('user')
  const { name, email } = await c.req.json()

  const trimmedName = name?.trim()
  const trimmedEmail = email != null ? email.trim().toLowerCase() : undefined

  if (trimmedName !== undefined && trimmedName.length < 1) {
    return c.json({ error: 'Name is required' }, 400)
  }

  if (trimmedEmail !== undefined) {
    if (trimmedEmail.length === 0) {
      return c.json({ error: 'Email cannot be empty' }, 400)
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return c.json({ error: 'Invalid email format' }, 400)
    }
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } })
    if (existing && existing.id !== user.id) {
      return c.json({ error: 'Email already in use' }, 409)
    }
  }

  const updateData: { name?: string; email?: string } = {}
  if (trimmedName !== undefined) updateData.name = trimmedName
  if (trimmedEmail !== undefined) updateData.email = trimmedEmail

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      currentHouseholdId: true,
      createdAt: true,
    },
  })

  return c.json({ user: updated })
})

authRoutes.post('/change-password', jwtMiddleware, loadUser, async (c) => {
  const user = c.get('user')
  const { currentPassword, newPassword } = await c.req.json()

  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current and new password are required' }, 400)
  }

  if (newPassword.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400)
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

  if (!dbUser) {
    return c.json({ error: 'Current password is incorrect' }, 401)
  }

  const validPassword = await bcrypt.compare(currentPassword, dbUser.password)

  if (!validPassword) {
    return c.json({ error: 'Current password is incorrect' }, 401)
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  return c.json({ success: true })
})
