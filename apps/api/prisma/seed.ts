import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await prisma.taskCompletion.deleteMany()
  await prisma.task.deleteMany()
  await prisma.notice.deleteMany()
  await prisma.shoppingItem.deleteMany()
  await prisma.shoppingList.deleteMany()
  await prisma.householdInvite.deleteMany()
  await prisma.householdMember.deleteMany()
  await prisma.household.deleteMany()
  await prisma.user.deleteMany()

  // Create test user
  const password = await bcrypt.hash('123456', 10)
  const user = await prisma.user.create({
    data: {
      email: 'pamplona@email.com',
      password,
      name: 'Lucas Pamplona',
    },
  })

  // Create second test user (for invite testing)
  const user2 = await prisma.user.create({
    data: {
      email: 'yasmin@email.com',
      password,
      name: 'Yasmin',
    },
  })

  // Create household
  const household = await prisma.household.create({
    data: {
      name: 'Casa Pamplona',
      members: {
        create: [
          { userId: user.id, role: 'OWNER' },
          { userId: user2.id, role: 'MEMBER' },
        ],
      },
    },
    include: { members: true },
  })

  // Set current household for user
  await prisma.user.update({
    where: { id: user.id },
    data: { currentHouseholdId: household.id },
  })

  // Create invite code
  const inviteCode = randomBytes(6).toString('hex').toUpperCase()
  await prisma.householdInvite.create({
    data: {
      code: inviteCode,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      householdId: household.id,
    },
  })

  console.log(`✅ Household created: ${household.name}`)
  console.log(`📋 Invite code: ${inviteCode}`)
  console.log(`🔑 Login: pamplona@email.com / 123456`)

  // Create notices
  await prisma.notice.createMany({
    data: [
      {
        title: 'Reunião de família',
        content: 'Domingo às 10h na sala',
        priority: 'high',
        householdId: household.id,
      },
      {
        title: 'Conta de luz vence',
        content: 'Pagar até dia 15',
        priority: 'normal',
        householdId: household.id,
      },
      {
        title: 'Buscar Savana no petshop',
        content: 'Sábado às 14h',
        priority: 'urgent',
        householdId: household.id,
      },
      {
        title: 'Regra da semana',
        content: 'Não deixar louça na pia',
        priority: 'low',
        isActive: true,
        householdId: household.id,
      },
    ],
  })

  // Create tasks
  await prisma.task.createMany({
    data: [
      {
        name: 'Passar pano na sala',
        description: 'Terças e sextas',
        type: 'WEEKLY',
        dayOfWeek: 2,
        householdId: household.id,
      },
      {
        name: 'Revisar gastos do mês',
        description: 'Todo dia 25',
        type: 'MONTHLY',
        dayOfMonth: 25,
        householdId: household.id,
      },
      {
        name: 'Levar lixo',
        description: 'Todo dia',
        type: 'DAILY',
        householdId: household.id,
      },
      {
        name: 'Comprar ração da Savana',
        description: 'Ração está acabando',
        type: 'ONE_TIME',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        householdId: household.id,
      },
      {
        name: 'Trocar Filters do ar',
        description: 'A cada 3 meses',
        type: 'MONTHLY',
        dayOfMonth: 1,
        householdId: household.id,
      },
    ],
  })

  // Create shopping list
  const shoppingList = await prisma.shoppingList.create({
    data: {
      name: 'Supermercado semanal',
      householdId: household.id,
    },
  })

  await prisma.shoppingItem.createMany({
    data: [
      { name: 'Leite', quantity: 2, listId: shoppingList.id },
      { name: 'Pão', quantity: 1, listId: shoppingList.id },
      { name: 'Ovos', quantity: 12, listId: shoppingList.id },
      { name: 'Café', quantity: 1, listId: shoppingList.id },
      { name: 'Arroz', quantity: 2, listId: shoppingList.id },
      { name: 'Feijão', quantity: 1, listId: shoppingList.id },
      { name: 'Ração Savana', quantity: 1, isChecked: true, listId: shoppingList.id },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('')
  console.log('📦 Data created:')
  console.log('   - 2 users (pamplona@email.com, yasmin@email.com / 123456)')
  console.log('   - 1 household (Casa Pamplona)')
  console.log('   - 4 notices')
  console.log('   - 5 tasks (daily, weekly, monthly, one-time)')
  console.log('   - 1 shopping list with 7 items')
  console.log('')
  console.log('🔑 First invite code:', inviteCode)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
