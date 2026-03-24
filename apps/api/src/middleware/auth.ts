import { Context, Next } from 'hono'
import { jwt } from 'hono/jwt'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export const jwtMiddleware = jwt({
  secret: JWT_SECRET,
})

export async function auth(c: Context, next: Next) {
  try {
    const payload = c.get('jwtPayload')
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
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
