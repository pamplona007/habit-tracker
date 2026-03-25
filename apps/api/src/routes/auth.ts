import { Hono } from 'hono'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET, jwtMiddleware, loadUser } from '../middleware/auth'
import type { AppBindings } from '../types'

export const authRoutes = new Hono<AppBindings>()

// POST /auth/register
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

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })

  return c.json({ user, token })
})

// POST /auth/login
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

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })

  const { password: _, ...userWithoutPassword } = user

  return c.json({ user: userWithoutPassword, token })
})

// GET /auth/me — protegida
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
      createdAt: true,
    },
  })

  return c.json({ user: fullUser })
})

// PATCH /auth/me — atualizar perfil
authRoutes.patch('/me', jwtMiddleware, loadUser, async (c) => {
  const user = c.get('user')
  const { name, email } = await c.req.json()

  if (name !== undefined && name.trim().length < 1) {
    return c.json({ error: 'Name is required' }, 400)
  }

  if (email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== user.id) {
      return c.json({ error: 'Email already in use' }, 409)
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name, email },
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

// POST /auth/change-password
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
  const validPassword = await bcrypt.compare(currentPassword, dbUser!.password)

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
