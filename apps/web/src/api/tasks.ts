import { apiClient } from './client'

export type TaskType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME'

export type Task = {
  id: string
  name: string
  description: string | null
  type: TaskType
  dayOfWeek: number | null
  dayOfMonth: number | null
  deadline: string | null
  isActive: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
  completions: Array<{
    id: string
    completedAt: string
    type: 'FULL' | 'PARTIAL'
    user: { id: string; name: string | null }
  }>
}

export const tasksApi = {
  list: async (householdId: string, type?: TaskType) => {
    const params = type ? { type } : {}
    const res = await apiClient.get<{ tasks: Task[] }>(`/households/${householdId}/tasks`, { params })
    return res.data.tasks
  },

  create: async (householdId: string, data: Partial<Task>) => {
    const res = await apiClient.post<{ task: Task }>(`/households/${householdId}/tasks`, data)
    return res.data.task
  },

  update: async (householdId: string, taskId: string, data: Partial<Task>) => {
    const res = await apiClient.patch<{ task: Task }>(
      `/households/${householdId}/tasks/${taskId}`,
      data
    )
    return res.data.task
  },

  complete: async (householdId: string, taskId: string, type: 'FULL' | 'PARTIAL' = 'FULL') => {
    const res = await apiClient.post<{ completion: Task['completions'][0] }>(
      `/households/${householdId}/tasks/${taskId}/complete`,
      { type }
    )
    return res.data.completion
  },

  // Toggle: if already completed today, undo it
  toggleComplete: async (householdId: string, taskId: string) => {
    const res = await apiClient.delete(`/households/${householdId}/tasks/${taskId}/complete`)
    return res.data
  },

  delete: async (householdId: string, taskId: string) => {
    await apiClient.delete(`/households/${householdId}/tasks/${taskId}`)
  },
}
