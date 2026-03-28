import type { MiddlewareHandler } from 'hono'
import type { AppBindings } from '../types'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}

setInterval(cleanupExpiredEntries, 60 * 1000)

function getKey(c: { req: { header: (name: string) => string | undefined; ip: string } }): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || c.req.ip
    || 'unknown'
}

export function createRateLimiter(windowMs: number, maxRequests: number): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    if (process.env.NODE_ENV === 'test') {
      await next()
      return
    }

    const key = getKey(c)
    const now = Date.now()
    const entry = rateLimitStore.get(key)

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    } else {
      entry.count++
    }

    const current = rateLimitStore.get(key)!
    const remaining = Math.max(0, maxRequests - current.count)
    const resetIn = Math.ceil((current.resetAt - now) / 1000)

    c.header('X-RateLimit-Limit', String(maxRequests))
    c.header('X-RateLimit-Remaining', String(remaining))
    c.header('X-RateLimit-Reset', String(resetIn))

    if (current.count > maxRequests) {
      return c.json(
        { error: 'Too many requests, please try again later' },
        429
      )
    }

    await next()
  }
}

export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 20)
