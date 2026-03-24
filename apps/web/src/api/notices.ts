import { apiClient } from './client'

export type NoticePriority = 'low' | 'normal' | 'high' | 'urgent'

export type Notice = {
  id: string
  title: string
  content: string
  priority: NoticePriority
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

export const noticesApi = {
  list: async (householdId: string) => {
    const res = await apiClient.get<{ notices: Notice[] }>(
      `/households/${householdId}/notices`
    )
    return res.data.notices
  },

  create: async (householdId: string, data: Partial<Notice>) => {
    const res = await apiClient.post<{ notice: Notice }>(
      `/households/${householdId}/notices`,
      data
    )
    return res.data.notice
  },

  update: async (householdId: string, noticeId: string, data: Partial<Notice>) => {
    const res = await apiClient.patch<{ notice: Notice }>(
      `/households/${householdId}/notices/${noticeId}`,
      data
    )
    return res.data.notice
  },

  delete: async (householdId: string, noticeId: string) => {
    await apiClient.delete(`/households/${householdId}/notices/${noticeId}`)
  },
}
