import { Hono } from 'hono'
import { prisma } from '../db'
import { randomBytes } from 'crypto'
import { jwtMiddleware, loadUser, requireHouseholdMembership } from '../middleware/auth'
import type { AppBindings } from '../types'
import type { MiddlewareHandler } from 'hono'

export const householdsRoutes = new Hono<AppBindings>()

// Verifica se o user é OWNER ou ADMIN da household (não pode ser só MEMBER)
const requireHouseholdAdmin: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get('user')
  const householdId = c.get('householdId')

  const membership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: user.id } },
  })

  if (!membership || membership.role === 'MEMBER') {
    return c.json({ error: 'Not authorized' }, 403)
  }

  await next()
}

// POST /households — criar casa e já ser membro
householdsRoutes.post('/', async (c) => {
  const user = c.get('user')
  const { name } = await c.req.json()

  if (!name || name.trim().length < 2) {
    return c.json({ error: 'Household name is required (min 2 chars)' }, 400)
  }

  const household = await prisma.household.create({
    data: {
      name: name.trim(),
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  })

  // Define como household ativa do user
  await prisma.user.update({
    where: { id: user.id },
    data: { currentHouseholdId: household.id },
  })

  return c.json({ household }, 201)
})

// GET /households — listar casas que o user é membro
householdsRoutes.get('/', async (c) => {
  const user = c.get('user')

  const memberships = await prisma.householdMember.findMany({
    where: { userId: user.id },
    include: {
      household: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          invites: {
            where: { isUsed: false, expiresAt: { gt: new Date() } },
            select: { id: true, code: true, expiresAt: true, createdAt: true },
          },
        },
      },
    },
  })

  return c.json({ households: memberships.map((m) => m.household) })
})

// POST /households/join — entrar com código
householdsRoutes.post('/join', async (c) => {
  const user = c.get('user')
  const { code } = await c.req.json()

  if (!code || typeof code !== 'string') {
    return c.json({ error: 'Invite code is required' }, 400)
  }

  const invite = await prisma.householdInvite.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { household: true },
  })

  if (!invite) {
    return c.json({ error: 'Invalid invite code' }, 404)
  }

  if (invite.isUsed) {
    return c.json({ error: 'This invite has already been used' }, 400)
  }

  if (invite.expiresAt < new Date()) {
    return c.json({ error: 'This invite has expired' }, 400)
  }

  // Atomic: marca invite como usado E cria membership
  const result = await prisma.$transaction([
    prisma.householdInvite.update({
      where: { id: invite.id },
      data: { isUsed: true, usedById: user.id },
    }),
    prisma.householdMember.create({
      data: {
        householdId: invite.householdId,
        userId: user.id,
        role: 'MEMBER',
      },
      include: {
        household: {
          include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
        },
      },
    }),
    // Define como household ativa
    prisma.user.update({
      where: { id: user.id },
      data: { currentHouseholdId: invite.householdId },
    }),
  ])

  return c.json({ household: result[1].household })
})

// GET /households/:householdId — detalhes de uma casa (precisa ser membro via middleware)
householdsRoutes.get('/:householdId', requireHouseholdMembership, async (c) => {
  const householdId = c.get('householdId')

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      invites: {
        where: { isUsed: false, expiresAt: { gt: new Date() } },
        select: { id: true, code: true, expiresAt: true, createdAt: true },
      },
    },
  })

  if (!household) {
    return c.json({ error: 'Household not found' }, 404)
  }

  return c.json({ household })
})

// PATCH /households/:householdId — atualizar casa (nome)
householdsRoutes.patch('/:householdId', requireHouseholdMembership, requireHouseholdAdmin, async (c) => {
  const householdId = c.get('householdId')
  const { name } = await c.req.json()

  if (!name || name.trim().length < 2) {
    return c.json({ error: 'Household name is required (min 2 chars)' }, 400)
  }

  const household = await prisma.household.update({
    where: { id: householdId },
    data: { name: name.trim() },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  })

  return c.json({ household })
})

// POST /households/:householdId/invites — gerar convite
householdsRoutes.post('/:householdId/invites', requireHouseholdMembership, async (c) => {
  const householdId = c.get('householdId')
  const { expiresInHours } = await c.req.json()

  const hours = Math.min(Math.max(Number(expiresInHours) || 24, 1), 168)
  const code = randomBytes(6).toString('hex').toUpperCase()

  const invite = await prisma.householdInvite.create({
    data: {
      code,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
      householdId,
    },
  })

  return c.json({ invite: { code: invite.code, expiresAt: invite.expiresAt } }, 201)
})

// POST /households/:householdId/switch — trocar casa ativa
householdsRoutes.post('/:householdId/switch', requireHouseholdMembership, async (c) => {
  const user = c.get('user')
  const householdId = c.get('householdId')

  await prisma.user.update({
    where: { id: user.id },
    data: { currentHouseholdId: householdId },
  })

  return c.json({ success: true })
})

// POST /households/:householdId/leave — sair da casa
householdsRoutes.post('/:householdId/leave', requireHouseholdMembership, async (c) => {
  const user = c.get('user')
  const householdId = c.get('householdId')

  const memberCount = await prisma.householdMember.count({
    where: { householdId },
  })

  if (memberCount <= 1) {
    return c.json({ error: 'Cannot leave: you are the only member. Delete the household instead.' }, 400)
  }

  await prisma.householdMember.delete({
    where: {
      householdId_userId: { householdId, userId: user.id },
    },
  })

  // Se era a casa ativa, troca para outra
  if (user.currentHouseholdId === householdId) {
    const otherMembership = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    })
    await prisma.user.update({
      where: { id: user.id },
      data: { currentHouseholdId: otherMembership?.householdId ?? null },
    })
  }

  return c.json({ success: true })
})

// PATCH /households/:householdId/members/:userId — atualizar role de membro
householdsRoutes.patch('/:householdId/members/:userId', jwtMiddleware, loadUser, requireHouseholdMembership, async (c) => {
  const householdId = c.get('householdId')
  const targetUserId = c.req.param('userId')
  const user = c.get('user')
  const { role } = await c.req.json()

  // Only OWNER can change roles
  const ownerMembership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: user.id } },
  })

  if (ownerMembership?.role !== 'OWNER') {
    return c.json({ error: 'Not authorized' }, 403)
  }

  // Validate role
  if (!['ADMIN', 'MEMBER'].includes(role)) {
    return c.json({ error: 'Invalid role' }, 400)
  }

  // Check if target user is a member
  const targetMembership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: targetUserId } },
  })

  if (!targetMembership) {
    return c.json({ error: 'Member not found' }, 404)
  }

  // Cannot change own role if you are the last owner
  if (user.id === targetUserId) {
    const ownerCount = await prisma.householdMember.count({
      where: { householdId, role: 'OWNER' },
    })
    if (ownerCount <= 1) {
      return c.json({ error: 'Cannot change your own role' }, 400)
    }
  }

  // Cannot demote last owner (when changing someone else)
  if (targetMembership.role === 'OWNER') {
    const ownerCount = await prisma.householdMember.count({
      where: { householdId, role: 'OWNER' },
    })
    if (ownerCount <= 1) {
      return c.json({ error: 'Cannot demote the last owner' }, 400)
    }
  }

  const updated = await prisma.householdMember.update({
    where: { householdId_userId: { householdId, userId: targetUserId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return c.json({ member: updated })
})

// DELETE /households/:householdId/members/:userId — remover membro
householdsRoutes.delete('/:householdId/members/:userId', jwtMiddleware, loadUser, requireHouseholdMembership, async (c) => {
  const householdId = c.get('householdId')
  const targetUserId = c.req.param('userId')
  const user = c.get('user')

  // Only OWNER can remove members
  const ownerMembership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: user.id } },
  })

  if (ownerMembership?.role !== 'OWNER') {
    return c.json({ error: 'Not authorized' }, 403)
  }

  // Cannot remove yourself
  if (user.id === targetUserId) {
    return c.json({ error: 'Cannot remove yourself. Use leave instead.' }, 400)
  }

  // Check if target exists
  const targetMembership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: targetUserId } },
  })

  if (!targetMembership) {
    return c.json({ error: 'Member not found' }, 404)
  }

  // Check if this is the last member
  const memberCount = await prisma.householdMember.count({
    where: { householdId },
  })

  if (memberCount <= 1) {
    return c.json({ error: 'Cannot remove the last member' }, 400)
  }

  await prisma.householdMember.delete({
    where: { householdId_userId: { householdId, userId: targetUserId } },
  })

  return c.json({ success: true })
})
