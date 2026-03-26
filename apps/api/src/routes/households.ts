import { Hono } from 'hono'
import { prisma } from '../db'
import { randomBytes } from 'crypto'
import { requireHouseholdMembership } from '../middleware/auth'
import type { AppBindings } from '../types'
import type { MiddlewareHandler } from 'hono'

export const householdsRoutes = new Hono<AppBindings>()


const requireHouseholdAdmin: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get('user')
  const householdId = c.get('householdId')

  const membership = user.memberships?.find(
    (m: { householdId: string; role: string }) => m.householdId === householdId,
  )

  if (!membership || membership.role === 'MEMBER') {
    return c.json({ error: 'Not authorized' }, 403)
  }

  await next()
}


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


  await prisma.user.update({
    where: { id: user.id },
    data: { currentHouseholdId: household.id },
  })

  return c.json({ household }, 201)
})


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

    prisma.user.update({
      where: { id: user.id },
      data: { currentHouseholdId: invite.householdId },
    }),
  ])

  return c.json({ household: result[1].household })
})


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


householdsRoutes.post('/:householdId/invites', requireHouseholdMembership, async (c) => {
  const householdId = c.get('householdId')
  const body = await c.req.json().catch(() => ({}))
  const { expiresInHours } = body

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


householdsRoutes.post('/:householdId/switch', requireHouseholdMembership, async (c) => {
  const user = c.get('user')
  const householdId = c.get('householdId')

  await prisma.user.update({
    where: { id: user.id },
    data: { currentHouseholdId: householdId },
  })

  return c.json({ success: true })
})


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


householdsRoutes.patch('/:householdId/members/:userId', requireHouseholdMembership, async (c) => {
  const householdId = c.get('householdId')
  const targetUserId = c.req.param('userId')
  const user = c.get('user')
  const { role } = await c.req.json()


  const ownerMembership = user.memberships?.find(
    (m: { householdId: string; role: string }) => m.householdId === householdId,
  )

  if (ownerMembership?.role !== 'OWNER') {
    return c.json({ error: 'Not authorized' }, 403)
  }


  if (!['ADMIN', 'MEMBER'].includes(role)) {
    return c.json({ error: 'Invalid role' }, 400)
  }


  const targetMembership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: targetUserId! } },
  })

  if (!targetMembership) {
    return c.json({ error: 'Member not found' }, 404)
  }


  if (targetMembership.role === 'OWNER') {
    return c.json({ error: 'Cannot change the role of an owner' }, 400)
  }

  const updated = await prisma.householdMember.update({
    where: { householdId_userId: { householdId, userId: targetUserId! } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return c.json({ member: updated })
})


householdsRoutes.delete('/:householdId/members/:userId', requireHouseholdMembership, async (c) => {
  const householdId = c.get('householdId')
  const targetUserId = c.req.param('userId')
  const user = c.get('user')


  const ownerMembership = user.memberships?.find(
    (m: { householdId: string; role: string }) => m.householdId === householdId,
  )

  if (ownerMembership?.role !== 'OWNER') {
    return c.json({ error: 'Not authorized' }, 403)
  }


  if (user.id === targetUserId) {
    return c.json({ error: 'Cannot remove yourself. Use leave instead.' }, 400)
  }


  const memberCount = await prisma.householdMember.count({
    where: { householdId },
  })

  if (memberCount <= 1) {
    return c.json({ error: 'Cannot remove the last member' }, 400)
  }


  await prisma.$transaction(async (tx) => {
    await tx.householdMember.delete({
      where: { householdId_userId: { householdId, userId: targetUserId! } },
    })


    const removedUser = await tx.user.findUnique({
      where: { id: targetUserId },
      include: { memberships: true },
    })

    if (removedUser && removedUser.currentHouseholdId === householdId) {
      const remainingMembership = removedUser.memberships.find(
        (membership) => membership.householdId !== householdId,
      )

      await tx.user.update({
        where: { id: targetUserId },
        data: {
          currentHouseholdId: remainingMembership ? remainingMembership.householdId : null,
        },
      })
    }
  })

  return c.json({ success: true })
})
