import webpush from 'web-push'

let vapidConfigured = false

function ensureVapid() {
  if (!vapidConfigured && process.env.PUSH_VAPID_SUBJECT) {
    webpush.setVapidDetails(
      process.env.PUSH_VAPID_SUBJECT,
      process.env.PUSH_VAPID_PUBLIC_KEY || '',
      process.env.PUSH_VAPID_PRIVATE_KEY || '',
    )
    vapidConfigured = true
  }
}

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  url?: string
}

export interface PushSubscriptionData {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: NotificationPayload
): Promise<{ success: boolean; deactivated?: boolean }> {
  ensureVapid()
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload)
    )
    return { success: true }
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { success: false, deactivated: true }
    }
    throw err
  }
}

export async function sendToUser(
  userId: string,
  payload: NotificationPayload,
  prisma: any
): Promise<{ sent: number; deactivated: number }> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
  })

  let sent = 0
  let deactivated = 0

  for (const sub of subscriptions) {
    const keys = JSON.parse(sub.keys)
    const result = await sendPushNotification({ endpoint: sub.endpoint, keys }, payload)

    if (result.deactivated) {
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { isActive: false },
      })
      deactivated++
    } else {
      sent++
    }
  }

  return { sent, deactivated }
}

export async function broadcastToHousehold(
  householdId: string,
  excludeUserId: string,
  payload: NotificationPayload,
  prisma: any
): Promise<{ sent: number; deactivated: number }> {
  const members = await prisma.householdMember.findMany({
    where: { householdId, userId: { not: excludeUserId } },
    select: { userId: true },
  })

  let totalSent = 0
  let totalDeactivated = 0

  for (const member of members) {
    const result = await sendToUser(member.userId, payload, prisma)
    totalSent += result.sent
    totalDeactivated += result.deactivated
  }

  return { sent: totalSent, deactivated: totalDeactivated }
}
