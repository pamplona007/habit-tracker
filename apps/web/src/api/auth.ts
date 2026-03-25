import { apiClient } from './client';
import type { AuthResponse, User } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },

  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', { email, password, name });
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<{ user: User }>('/auth/me');
    return data.user;
  },

  updateProfile: async (data: { name?: string; email?: string }): Promise<User> => {
    const { data: response } = await apiClient.patch<{ user: User }>('/auth/me', data);
    return response.user;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean }> => {
    const { data: response } = await apiClient.post<{ success: boolean }>('/auth/change-password', data);
    return response;
  },
};
