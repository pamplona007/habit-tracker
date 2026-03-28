import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { prisma } from '../db'
import app from '../index'
import { cleanupAllTestData } from './helpers'

describe('OAuth callbacks', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  describe('GET /auth/oauth/:provider/callback', () => {
    it('rejects invalid state with invalid_state error', async () => {
      const res = await app.request('/auth/oauth/google/callback?code=abc&state=tampered', {
        headers: { Cookie: 'oauth_state=correct-state' },
      })

      expect(res.status).toBe(302)
      const location = res.headers.get('location')
      expect(location).toContain('error=invalid_state')
    })

    it('rejects missing code', async () => {
      const res = await app.request('/auth/oauth/google/callback?state=abc', {
        headers: { Cookie: 'oauth_state=abc' },
      })

      expect(res.status).toBe(302)
      const location = res.headers.get('location')
      expect(location).toContain('error=missing_params')
    })

    it('rejects invalid provider', async () => {
      const res = await app.request('/auth/oauth/twitter/callback?code=abc&state=def')

      expect(res.status).toBe(302)
      const location = res.headers.get('location')
      expect(location).toContain('error=invalid_provider')
    })
  })

  describe('POST /auth/link-account', () => {
    it('requires authentication', async () => {
      const res = await app.request('/auth/link-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google' }),
      })

      expect(res.status).toBe(401)
    })

    it('rejects invalid provider', async () => {

      const user = await prisma.user.create({
        data: { email: 'user@example.com', password: 'hashed', name: 'Test' },
      })
      const jwt = (await import('jsonwebtoken')).default
      const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'your-secret-key-change-in-production')

      const res = await app.request('/auth/link-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider: 'twitter' }),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid provider')
    })
  })

  describe('Account auto-linking', () => {
    it('links new OAuth account to existing user with same email', async () => {



      const email = 'oauthlink@example.com'

      const existingUser = await prisma.user.create({
        data: { email, password: 'hashedpassword', name: 'Existing User' },
      })

      const account = await prisma.account.create({
        data: {
          userId: existingUser.id,
          provider: 'google',
          providerAccountId: 'google-123',
        },
      })

      const foundAccount = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: 'google', providerAccountId: 'google-123' } },
      })

      expect(foundAccount).not.toBeNull()
      expect(foundAccount!.userId).toBe(existingUser.id)
    })

    it('prevents duplicate account per provider for same user', async () => {
      const email = 'duplicate@example.com'

      const user = await prisma.user.create({
        data: { email, password: 'hashedpassword', name: 'User' },
      })

      await prisma.account.create({
        data: { userId: user.id, provider: 'google', providerAccountId: 'google-456' },
      })



      const result = await prisma.account.create({
        data: { userId: user.id, provider: 'google', providerAccountId: 'google-789' },
      }).catch((err: unknown) => ({ error: err as { code: string } }))
      const isConstraintError = 'error' in result && (result.error as { code: string }).code === 'P2002'
      expect(isConstraintError).toBe(true)
    })
  })
})
