import { apiClient } from './client';
import type { Notice, NoticePriority } from '../types';

export const noticesApi = {
  list: async (householdId: string): Promise<Notice[]> => {
    const { data } = await apiClient.get<{ notices: Notice[] }>(`/households/${householdId}/notices`);
    return data.notices;
  },

  create: async (householdId: string, notice: {
    title: string;
    content: string;
    priority?: NoticePriority;
    startDate?: string;
    endDate?: string;
  }): Promise<Notice> => {
    const { data } = await apiClient.post<{ notice: Notice }>(`/households/${householdId}/notices`, notice);
    return data.notice;
  },

  update: async (householdId: string, noticeId: string, updates: Partial<Notice>): Promise<Notice> => {
    const { data } = await apiClient.patch<{ notice: Notice }>(`/households/${householdId}/notices/${noticeId}`, updates);
    return data.notice;
  },

  delete: async (householdId: string, noticeId: string): Promise<void> => {
    await apiClient.delete(`/households/${householdId}/notices/${noticeId}`);
  },
};
