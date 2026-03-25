import type { Context, Next } from 'hono'
import type { User, HouseholdMember } from '@prisma/client'

// User type returned from DB (includes memberships)
export type AuthUser = User & {
  memberships: (HouseholdMember & {
    household: { id: string; name: string }
  })[]
}

// JWT payload structure
export type JwtPayload = {
  sub: string
  iat?: number
  exp?: number
}

// Hono context variables
export type AppBindings = {
  Variables: {
    user: AuthUser
    householdId: string
    jwtPayload: JwtPayload
  }
}

// Typed Hono context
export type AppContext = Context<AppBindings>
export type AppNext = Next
