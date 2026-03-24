import { apiClient } from './client'

export type User = {
  id: string
  email: string
  name: string | null
  currentHouseholdId: string | null
  memberships: Array<{
    household: { id: string; name: string }
  }>
  createdAt: string
}

export type AuthResponse = {
  user: User
  token: string
}

export const authApi = {
  register: async (data: { email: string; password: string; name?: string }) => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data)
    return res.data
  },

  login: async (data: { email: string; password: string }) => {
    const res = await apiClient.post<AuthResponse>('/auth/login', data)
    return res.data
  },

  me: async () => {
    const res = await apiClient.get<{ user: User }>('/auth/me')
    return res.data.user
  },
}
