import type { Context, Next } from 'hono'
import { jwt } from 'hono/jwt'
import { prisma } from '../db'
import type { AppBindings, AuthUser } from '../types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export { JWT_SECRET }

export const jwtMiddleware = jwt({
  secret: JWT_SECRET,
  alg: 'HS256',
})

export async function loadUser(c: Context<AppBindings>, next: Next) {
  try {
    const payload = c.get('jwtPayload') as { sub: string; type?: string }

    // Ensure this is an access token
    if (payload.type && payload.type !== 'access') {
      return c.json({ error: 'Invalid token type' }, 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          include: { household: { select: { id: true, name: true } } },
        },
      },
    }) as AuthUser | null

    if (!user) {
      return c.json({ error: 'User not found' }, 401)
    }

    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

export async function requireHouseholdMembership(c: Context<AppBindings>, next: Next) {
  const user = c.get('user')
  const householdId = c.req.param('householdId')

  if (!householdId) {
    return c.json({ error: 'Household ID is required' }, 400)
  }

  const isMember = user.memberships.some((m) => m.householdId === householdId)

  if (!isMember) {
    return c.json({ error: 'You are not a member of this household' }, 403)
  }

  c.set('householdId', householdId)
  await next()
}

export async function requireCurrentHousehold(c: Context<AppBindings>, next: Next) {
  const user = c.get('user')

  if (!user.currentHouseholdId) {
    return c.json({ error: 'No active household. Create or join one first.' }, 403)
  }

  const isMember = user.memberships.some(
    (m) => m.householdId === user.currentHouseholdId
  )

  if (!isMember) {
    return c.json({ error: 'Active household membership is invalid' }, 403)
  }

  c.set('householdId', user.currentHouseholdId)
  await next()
}
