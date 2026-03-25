import { apiClient } from './client';
import type { Task, TaskType, TaskPriority, CompletionType } from '../types';

export const tasksApi = {
  list: async (householdId: string, type?: TaskType): Promise<Task[]> => {
    const params = type ? { type } : {};
    const { data } = await apiClient.get<{ tasks: Task[] }>(`/households/${householdId}/tasks`, { params });
    return data.tasks;
  },

  create: async (householdId: string, task: {
    name: string;
    description?: string;
    type: TaskType;
    priority?: TaskPriority;
    dayOfWeek?: number;
    dayOfMonth?: number;
    deadline?: string;
  }): Promise<Task> => {
    const { data } = await apiClient.post<{ task: Task }>(`/households/${householdId}/tasks`, task);
    return data.task;
  },

  update: async (householdId: string, taskId: string, updates: Partial<Task>): Promise<Task> => {
    const { data } = await apiClient.patch<{ task: Task }>(`/households/${householdId}/tasks/${taskId}`, updates);
    return data.task;
  },

  complete: async (householdId: string, taskId: string, type: CompletionType): Promise<void> => {
    await apiClient.post(`/households/${householdId}/tasks/${taskId}/complete`, { type });
  },

  uncomplete: async (householdId: string, taskId: string): Promise<void> => {
    await apiClient.delete(`/households/${householdId}/tasks/${taskId}/complete`);
  },

  delete: async (householdId: string, taskId: string): Promise<void> => {
    await apiClient.delete(`/households/${householdId}/tasks/${taskId}`);
  },
};
