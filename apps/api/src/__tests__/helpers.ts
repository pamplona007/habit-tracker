import { prisma } from '../db'
import { randomUUID } from 'crypto'

export async function cleanupTestData() {
  const testHouseholds = await prisma.household.findMany({
    where: { name: { contains: 'Test' } },
    select: { id: true },
  })
  const householdIds = testHouseholds.map(h => h.id)

  await prisma.householdMember.deleteMany({
    where: { householdId: { in: householdIds } },
  })

  await prisma.household.deleteMany({
    where: { id: { in: householdIds } },
  })

  await prisma.user.deleteMany({
    where: { email: { contains: '@example.com' } },
  })

  await prisma.householdInvite.deleteMany({
    where: {
      code: { in: (await prisma.householdInvite.findMany({
        where: { code: { contains: '' } },
        select: { code: true },
        take: 100,
      })).map(i => i.code) },
    },
  })
}

export async function cleanupAllTestData() {
  await prisma.taskCompletion.deleteMany()
  await prisma.task.deleteMany()
  await prisma.notice.deleteMany()
  await prisma.shoppingItem.deleteMany()
  await prisma.shoppingList.deleteMany()
  await prisma.householdInvite.deleteMany()
  await prisma.householdMember.deleteMany()
  await prisma.household.deleteMany()
  await prisma.user.deleteMany({
    where: { email: { contains: '@example.com' } },
  })
}

export function uniqueEmail(): string {
  return `test-${randomUUID()}@example.com`
}
