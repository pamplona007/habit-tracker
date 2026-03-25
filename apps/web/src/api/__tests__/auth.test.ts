import { describe, it, expect, vi } from 'vitest';
import { apiClient } from '../client';
import { authApi } from '../auth';

vi.mock('../client', () => ({
  apiClient: {
    patch: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('authApi', () => {
  describe('updateProfile', () => {
    it('calls PATCH /auth/me with data', async () => {
      const mockData = { name: 'New Name' };
      (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: '1', name: 'New Name', email: 'test@example.com' } },
      });

      const result = await authApi.updateProfile(mockData);

      expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', mockData);
      expect(result.name).toBe('New Name');
    });
  });

  describe('changePassword', () => {
    it('calls POST /auth/change-password with data', async () => {
      const mockData = { currentPassword: 'old', newPassword: 'newpassword123' };
      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });

      const result = await authApi.changePassword(mockData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', mockData);
      expect(result.success).toBe(true);
    });
  });
});