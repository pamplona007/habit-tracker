import { apiClient } from './client';
import type { Streak } from '../types';

export const streakApi = {
  get: async (householdId: string): Promise<Streak> => {
    const { data } = await apiClient.get<{ streak: Streak }>(`/households/${householdId}/streak`);
    return data.streak;
  },
};
