import { apiClient } from './client'

export type HouseholdMember = {
  id: string
  name: string | null
  email: string
}

export type HouseholdInvite = {
  id: string
  code: string
  expiresAt: string
  createdAt: string
}

export type Household = {
  id: string
  name: string
  members: Array<{ user: HouseholdMember; role: 'OWNER' | 'ADMIN' | 'MEMBER'; joinedAt: string }>
  invites: HouseholdInvite[]
  createdAt: string
}

export const householdsApi = {
  list: async () => {
    const res = await apiClient.get<{ households: Household[] }>('/households')
    return res.data.households
  },

  get: async (householdId: string) => {
    const res = await apiClient.get<{ household: Household }>(`/households/${householdId}`)
    return res.data.household
  },

  create: async (data: { name: string }) => {
    const res = await apiClient.post<{ household: Household }>('/households', data)
    return res.data.household
  },

  join: async (code: string) => {
    const res = await apiClient.post<{ household: Household }>('/households/join', { code })
    return res.data.household
  },

  switch: async (householdId: string) => {
    await apiClient.post(`/households/${householdId}/switch`)
  },

  leave: async (householdId: string) => {
    await apiClient.post(`/households/${householdId}/leave`)
  },

  createInvite: async (householdId: string, expiresInHours?: number) => {
    const res = await apiClient.post<{ invite: { code: string; expiresAt: string } }>(
      `/households/${householdId}/invites`,
      { expiresInHours }
    )
    return res.data.invite
  },
}
