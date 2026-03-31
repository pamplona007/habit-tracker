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

  refresh: async (): Promise<{ accessToken: string }> => {
    const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh');
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
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

  oauthRedirect: (provider: 'google' | 'github') => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/oauth/${provider}`;
  },

  linkAccount: async (provider: 'google' | 'github'): Promise<{ redirectUrl: string }> => {
    const { data } = await apiClient.post<{ redirectUrl: string }>('/auth/link-account', { provider });
    return data;
  },

  updateImage: async (image: string | null, provider?: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.patch<{ success: boolean }>('/auth/me/image', { image, provider });
    return data;
  },
};
