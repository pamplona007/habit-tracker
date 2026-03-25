import { describe, it, expect, vi } from 'vitest';
import { apiClient } from '../client';
import { householdsApi } from '../households';

vi.mock('../client', () => ({
  apiClient: {
    patch: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('householdsApi', () => {
  describe('update', () => {
    it('calls PATCH /households/:id with data', async () => {
      (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { household: { id: '1', name: 'New Name' } },
      });

      const result = await householdsApi.update('1', { name: 'New Name' });

      expect(apiClient.patch).toHaveBeenCalledWith('/households/1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });

  describe('updateMemberRole', () => {
    it('calls PATCH /households/:id/members/:userId with role', async () => {
      (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { member: { userId: '2', role: 'ADMIN' } },
      });

      const result = await householdsApi.updateMemberRole('1', '2', 'ADMIN');

      expect(apiClient.patch).toHaveBeenCalledWith('/households/1/members/2', { role: 'ADMIN' });
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('removeMember', () => {
    it('calls DELETE /households/:id/members/:userId', async () => {
      (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });

      await householdsApi.removeMember('1', '2');

      expect(apiClient.delete).toHaveBeenCalledWith('/households/1/members/2');
    });
  });
});