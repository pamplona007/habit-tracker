# OAuth Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google and GitHub OAuth sign-in to the existing email/password auth system. OAuth accounts auto-link to existing users by email.

**Architecture:** Manual OAuth implementation using provider direct APIs (no auth library). New `Account` model links OAuth identities to users. Backend issues JWT on successful OAuth. Frontend has a dedicated callback page that stores the token and redirects.

**Tech Stack:** Bun, Hono, Prisma, PostgreSQL, React, Vite, Axios, TanStack Query

---

## File Map

### Backend
- `apps/api/prisma/schema.prisma` — add Account model
- `apps/api/src/types.ts` — add Account type
- `apps/api/src/routes/auth.ts` — add OAuth endpoints
- `apps/api/src/__tests__/auth-oauth.test.ts` — new OAuth tests

### Frontend
- `apps/web/src/api/auth.ts` — add `oauthRedirect()` function
- `apps/web/src/pages/AuthCallbackPage/index.tsx` — new callback page
- `apps/web/src/pages/index.ts` — export AuthCallbackPage
- `apps/web/src/App.tsx` — add `/auth/callback` route
- `apps/web/src/pages/LoginPage/index.tsx` — add OAuth buttons
- `apps/web/src/pages/SettingsPage/index.tsx` — add linked accounts section

---

## Task 1: Add Account model to Prisma schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma:1-174`

Add after the `ShoppingItem` model at the end of the file:

```prisma
model Account {
  id                String  @id @default(uuid())
  userId            String
  provider          String  // "google" | "github"
  providerAccountId String  // sub/id from OAuth provider

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@unique([provider, userId])
}
```

> Note: `accessToken`, `refreshToken`, `expiresAt` are excluded — not needed for basic OAuth sign-in. Add them only if the app later needs to call the OAuth provider API on the user's behalf.

Add to `User` model (after `completedTasks`):
```prisma
  accounts Account[]
```

- [ ] **Step 1: Edit schema.prisma**

- [ ] **Step 2: Run Prisma migration**

```bash
cd apps/api && bun run prisma migrate dev --name add-oauth-accounts
```

---

## Task 2: Add Account type

**Files:**
- Modify: `apps/api/src/types.ts`

Add to the imports from generated client and add Account type:

```ts
import type { User, HouseholdMember, Account as PrismaAccount } from './generated/client'

export type OAuthAccount = PrismaAccount
```

- [ ] **Step 1: Edit types.ts**

---

## Task 3: Add OAuth routes to auth.ts

**Files:**
- Modify: `apps/api/src/routes/auth.ts:1-182`

This is the largest task. Add three new route handlers.

### Constants (add at top of file, after imports)

```ts
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// 5-minute state cookie
const STATE_COOKIE = 'oauth_state'
const STATE_MAX_AGE = 60 * 5
```

### Helper: generateState

```ts
function generateState(): string {
  return Buffer.from(crypto.randomUUID() + crypto.randomUUID()).toString('base64url')
}
```

### Helper: buildRedirectUrl

```ts
function buildRedirectUrl(token: string, user: unknown): string {
  const params = new URLSearchParams({ token, user: JSON.stringify(user) })
  return `${FRONTEND_URL}/auth/callback?${params}`
}

function buildErrorRedirectUrl(error: string): string {
  const params = new URLSearchParams({ error })
  return `${FRONTEND_URL}/auth/callback?${params}`
}
```

### Also update GET /auth/me

Find the `authRoutes.get('/me', ...)` handler and add `accounts: true` to the select:

```ts
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
```

### Route: GET /auth/oauth/:provider

Add before `authRoutes.post('/register')`:

```ts
authRoutes.get('/oauth/:provider', async (c) => {
  const provider = c.req.param('provider')

  if (provider !== 'google' && provider !== 'github') {
    return c.json({ error: 'Invalid provider' }, 400)
  }

  const state = generateState()
  const frontendUrl = `${FRONTEND_URL}/auth/callback`

  c.header('Set-Cookie', `${STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Max-Age=${STATE_MAX_AGE}; Path=/`)

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${process.env.API_URL}/auth/oauth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    })
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  }

  // github
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.API_URL}/auth/oauth/github/callback`,
    scope: 'user:email',
    state,
  })
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`)
})
```

### Route: GET /auth/oauth/:provider/callback

Add after the `/oauth/:provider` route:

```ts
authRoutes.get('/oauth/:provider/callback', async (c) => {
  const provider = c.req.param('provider')
  const { code, state, error } = c.req.query()

  if (error) {
    return c.redirect(buildErrorRedirectUrl(error))
  }

  if (!code || !state) {
    return c.redirect(buildErrorRedirectUrl('missing_params'))
  }

  // Validate state
  const cookieValue = c.req.cookie(STATE_COOKIE)
  if (!cookieValue || cookieValue !== state) {
    return c.redirect(buildErrorRedirectUrl('invalid_state'))
  }

  let userInfo: { email: string; name?: string; id: string }

  if (provider === 'google') {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.API_URL}/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return c.redirect(buildErrorRedirectUrl('token_exchange_failed'))
    }

    const tokenData = await tokenRes.json() as { access_token: string }

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!userRes.ok) {
      return c.redirect(buildErrorRedirectUrl('user_info_failed'))
    }

    const googleUser = await userRes.json() as { email: string; name?: string; sub: string }
    userInfo = { email: googleUser.email, name: googleUser.name, id: googleUser.sub }

  } else if (provider === 'github') {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: `${process.env.API_URL}/auth/oauth/github/callback`,
      }),
    })

    if (!tokenRes.ok) {
      return c.redirect(buildErrorRedirectUrl('token_exchange_failed'))
    }

    const tokenData = await tokenRes.json() as { access_token: string }

    if (!tokenData.access_token) {
      return c.redirect(buildErrorRedirectUrl('token_exchange_failed'))
    }

    // Fetch user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github.v3+json' },
    })

    if (!userRes.ok) {
      return c.redirect(buildErrorRedirectUrl('user_info_failed'))
    }

    const githubUser = await userRes.json() as { email: string | null; name?: string; id: number }

    // GitHub may not return email if it's not public — fetch from /user/emails
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

  // Check if Account exists
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: userInfo.id } },
  })

  if (existingAccount) {
    // Existing OAuth user — issue JWT
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
    const token = jwt.sign({ sub: existingUser.id }, JWT_SECRET, { expiresIn: '7d' })
    const { password: _, ...userWithoutPassword } = existingUser
    return c.redirect(buildRedirectUrl(token, userWithoutPassword))
  }

  // No Account — check if user with this email exists
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email: userInfo.email },
    include: {
      memberships: { include: { household: { select: { id: true, name: true } } } },
      accounts: true,
    },
  })

  let userId: string

  if (existingUserByEmail) {
    // Auto-link: create Account attached to existing user
    userId = existingUserByEmail.id
  } else {
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: userInfo.email,
        name: userInfo.name || null,
        password: '', // OAuth users have no password
      },
    })
    userId = newUser.id
  }

  // Create Account
  await prisma.account.create({
    data: {
      userId,
      provider,
      providerAccountId: userInfo.id,
    },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { household: { select: { id: true, name: true } } } } },
  })

  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' })
  const { password: _, ...userWithoutPassword } = user!
  return c.redirect(buildRedirectUrl(token, userWithoutPassword))
})
```

### Route: POST /auth/link-account (authenticated)

Add after the `/oauth/:provider/callback` route:

```ts
authRoutes.post('/link-account', jwtMiddleware, loadUser, async (c) => {
  const { provider } = await c.req.json()

  if (provider !== 'google' && provider !== 'github') {
    return c.json({ error: 'Invalid provider' }, 400)
  }

  // Check if already linked
  const existing = await prisma.account.findUnique({
    where: { provider_userId: { provider, userId: c.get('user').id } },
  })

  if (existing) {
    return c.json({ error: 'Account already linked' }, 409)
  }

  const state = generateState()
  c.header('Set-Cookie', `${STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Max-Age=${STATE_MAX_AGE}; Path=/`)

  const redirectUri = `${process.env.API_URL}/auth/oauth/${provider}/link-callback`

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
```

### Route: GET /auth/oauth/:provider/link-callback (authenticated)

Add the link-callback handler. Since the user is authenticated, we validate from the JWT and link the account:

```ts
authRoutes.get('/oauth/:provider/link-callback', jwtMiddleware, loadUser, async (c) => {
  const provider = c.req.param('provider')
  const { code, state, error } = c.req.query()

  if (error) {
    return c.redirect(`${FRONTEND_URL}/settings?oauth_error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return c.redirect(`${FRONTEND_URL}/settings?oauth_error=missing_params`)
  }

  const cookieValue = c.req.cookie(STATE_COOKIE)
  if (!cookieValue || cookieValue !== state) {
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
        redirect_uri: `${process.env.API_URL}/auth/oauth/google/link-callback`,
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
        redirect_uri: `${process.env.API_URL}/auth/oauth/github/link-callback`,
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
      userId: c.get('user').id,
      provider,
      providerAccountId,
    },
  })

  return c.redirect(`${FRONTEND_URL}/settings?oauth_linked=${provider}`)
})
```

- [ ] **Step 1: Write the OAuth route handlers in auth.ts**

- [ ] **Step 2: Verify the file still compiles**

```bash
cd apps/api && bun run src/index.ts --help 2>&1 | head -5
```

---

## Task 4: Add OAuth test helpers

**Files:**
- Modify: `apps/api/src/__tests__/helpers.ts:51`
- Create: `apps/api/src/__tests__/auth-oauth.test.ts`

Add to `cleanupAllTestData()` in helpers.ts (before `await prisma.user.deleteMany`):
```ts
await prisma.account.deleteMany()
```

Add to `cleanupTestData()`:
```ts
await prisma.account.deleteMany({
  where: { userId: { in: (await prisma.user.findMany({ where: { email: { contains: '@example.com' } }, select: { id: true } })).map(u => u.id) } },
})
```

- [ ] **Step 1: Update helpers.ts**

- [ ] **Step 2: Create auth-oauth.test.ts** — tests for OAuth callback (mocking fetch for Google/GitHub token exchange), account auto-linking, duplicate link rejection

- [ ] **Step 3: Run tests**

```bash
cd apps/api && bun test src/__tests__/auth-oauth.test.ts
```

---

## Task 5: Frontend — API client and AuthCallbackPage

**Files:**
- Modify: `apps/web/src/api/auth.ts`
- Create: `apps/web/src/pages/AuthCallbackPage/index.tsx`
- Modify: `apps/web/src/pages/index.ts`
- Modify: `apps/web/src/App.tsx`

### Add to auth.ts

```ts
oauthRedirect: (provider: 'google' | 'github') => {
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/oauth/${provider}`
},

linkAccount: async (provider: 'google' | 'github'): Promise<{ redirectUrl: string }> => {
  const { data } = await apiClient.post<{ redirectUrl: string }>('/auth/link-account', { provider })
  return data
},
```

### Create AuthCallbackPage

```tsx
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const token = searchParams.get('token')
    const userParam = searchParams.get('user')
    const error = searchParams.get('error')

    if (error) {
      navigate(`/login?oauth_error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    if (!token || !userParam) {
      navigate('/login', { replace: true })
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam))
      login(token, user)
      navigate('/dashboard', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }, [searchParams, login, navigate])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #e5e7eb',
          borderTopColor: '#2563eb', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
        }} />
        <p>Signing you in...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
```

### Update pages/index.ts

Add after the TimerPage export:
```ts
export { AuthCallbackPage } from './AuthCallbackPage'
```

### Add route to App.tsx

Add after the `/login` route:
```tsx
<Route path="/auth/callback" element={<AuthCallbackPage />} />
```

- [ ] **Step 1: Update auth.ts**

- [ ] **Step 2: Create AuthCallbackPage**

- [ ] **Step 3: Update pages/index.ts**

- [ ] **Step 4: Add route to App.tsx**

- [ ] **Step 5: Verify app builds**

```bash
cd apps/web && bun run build 2>&1 | tail -10
```

---

## Task 6: Frontend — OAuth buttons on LoginPage

**Files:**
- Modify: `apps/web/src/pages/LoginPage/index.tsx`

Read the existing LoginPage to understand its structure before editing. Add two buttons:

```tsx
<button
  type="button"
  onClick={() => authApi.oauthRedirect('google')}
  style={{ /* match existing button styles */ }}
>
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Continue with Google
</button>

<button
  type="button"
  onClick={() => authApi.oauthRedirect('github')}
  style={{ /* match existing button styles */ }}
>
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
    <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
  Continue with GitHub
</button>
```

- [ ] **Step 1: Read LoginPage**

- [ ] **Step 2: Edit LoginPage — add OAuth buttons above the form divider**

- [ ] **Step 3: Also add OAuth error display** — read `oauth_error` from URL search params on LoginPage mount, show error toast

---

## Task 7: Frontend — Linked accounts section on SettingsPage

**Files:**
- Modify: `apps/web/src/pages/SettingsPage/index.tsx`

Add a "Linked Accounts" card in SettingsPage. Query the user's accounts from the me endpoint (update the AuthContext/hooks to include accounts in the User type).

First, update the AuthContext `login` function to store the full user including accounts. Then add the Linked Accounts UI to SettingsPage:

```tsx
// LinkedAccounts section
const [isLinkingGoogle, setIsLinkingGoogle] = useState(false)
const [isLinkingGithub, setIsLinkingGithub] = useState(false)

const handleLinkAccount = async (provider: 'google' | 'github') => {
  if (provider === 'google') setIsLinkingGoogle(true)
  else setIsLinkingGithub(true)
  try {
    const { redirectUrl } = await authApi.linkAccount(provider)
    window.location.href = redirectUrl
  } catch {
    setIsLinkingGoogle(false)
    setIsLinkingGithub(false)
  }
}

const hasGoogle = user?.accounts?.some(a => a.provider === 'google')
const hasGithub = user?.accounts?.some(a => a.provider === 'github')
```

Display each provider button as "Connect Google" / "Connect GitHub" or with a checkmark if linked.

Also handle `oauth_linked` and `oauth_error` query params on the SettingsPage (show a brief success/error message).

- [ ] **Step 1: Read SettingsPage**

- [ ] **Step 2: Check AuthContext to see if accounts are loaded**

- [ ] **Step 3: Add Linked Accounts card to SettingsPage**

---

## Task 8: Environment variables setup

Create a `.env.example` file documenting all required OAuth env vars:

```
# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
API_URL=https://your-api-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

- [ ] **Step 1: Create apps/api/.env.example**

---

## Final Commit

After all tasks are complete:

```bash
git add -A
git commit -m "feat(auth): add Google and GitHub OAuth authentication"
```
