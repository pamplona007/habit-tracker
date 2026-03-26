import type { Context, Next } from 'hono'
import type { User, HouseholdMember } from './generated/client'

export type AuthUser = User & {
  memberships: (HouseholdMember & {
    household: { id: string; name: string }
  })[]
}

export type JwtPayload = {
  sub: string
  iat?: number
  exp?: number
}

export type AppBindings = {
  Variables: {
    user: AuthUser
    householdId: string
    jwtPayload: JwtPayload
  }
}

export type AppContext = Context<AppBindings>
export type AppNext = Next
