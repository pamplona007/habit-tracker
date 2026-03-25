import { apiClient } from './client';
import type { Household, HouseholdMember, HouseholdInvite } from '../types';

export const householdsApi = {
  list: async (): Promise<Household[]> => {
    const { data } = await apiClient.get<{ households: Household[] }>('/households');
    return data.households;
  },

  get: async (id: string): Promise<Household & { members: HouseholdMember[]; invites: HouseholdInvite[] }> => {
    const { data } = await apiClient.get<{ household: Household & { members: HouseholdMember[]; invites: HouseholdInvite[] } }>(`/households/${id}`);
    return data.household;
  },

  create: async (name: string): Promise<Household> => {
    const { data } = await apiClient.post<{ household: Household }>('/households', { name });
    return data.household;
  },

  join: async (code: string): Promise<Household> => {
    const { data } = await apiClient.post<{ household: Household }>('/households/join', { code });
    return data.household;
  },

  switch: async (id: string): Promise<void> => {
    await apiClient.post(`/households/${id}/switch`);
  },

  leave: async (id: string): Promise<void> => {
    await apiClient.post(`/households/${id}/leave`);
  },

  createInvite: async (id: string): Promise<HouseholdInvite> => {
    const { data } = await apiClient.post<{ invite: HouseholdInvite }>(`/households/${id}/invites`);
    return data.invite;
  },
};
