import { Context, Next } from 'hono'
import { jwt } from 'hono/jwt'
import { prisma } from '../db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export { JWT_SECRET }

export const jwtMiddleware = jwt({
  secret: JWT_SECRET,
  alg: 'HS256',
})

// Carrega user com memberships (N:N)
export async function loadUser(c: Context, next: Next) {
  try {
    const payload = c.get('jwtPayload')
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          include: { household: { select: { id: true, name: true } } },
        },
      },
    })

    if (!user) {
      return c.json({ error: 'User not found' }, 401)
    }

    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

// Verifica se o user é membro da householdId no path
// Deve ser usado APÓS loadUser
export async function requireHouseholdMembership(c: Context, next: Next) {
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

// Verifica se o user tem alguma household ativa (currentHouseholdId)
export async function requireCurrentHousehold(c: Context, next: Next) {
  const user = c.get('user')

  if (!user.currentHouseholdId) {
    return c.json({ error: 'No active household. Create or join one first.' }, 403)
  }

  // Verifica que ainda é membro da currentHousehold
  const isMember = user.memberships.some(
    (m) => m.householdId === user.currentHouseholdId
  )

  if (!isMember) {
    return c.json({ error: 'Active household membership is invalid' }, 403)
  }

  c.set('householdId', user.currentHouseholdId)
  await next()
}
