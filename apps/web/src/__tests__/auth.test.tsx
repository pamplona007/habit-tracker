import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test', currentHouseholdId: null };

const localStorageStore: Record<string, string> = {};
const setAccessTokenMock = vi.fn();

const authApiMock = {
  me: vi.fn(),
  refresh: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  oauthRedirect: vi.fn(),
  linkAccount: vi.fn(),
};

vi.mock('../api/auth', () => ({
  authApi: authApiMock,
}));

vi.mock('../api/client', () => ({
  setAccessToken: setAccessTokenMock,
  getAccessToken: vi.fn(() => null),
  apiClient: {},
  unauthenticatedApi: {},
}));

import { AuthProvider, useAuth } from '../context/AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]);
    localStorageStore['localStorage'] = 'mock';
    setAccessTokenMock.mockImplementation((token: string | null) => {
      if (token === null) {
        delete localStorageStore['accessToken'];
      }
    });
  });

  describe('initAuth', () => {
    it('loads user from localStorage when accessToken is valid', async () => {
      localStorageStore['user'] = JSON.stringify(mockUser);
      localStorageStore['accessToken'] = 'valid-access-token';
      authApiMock.me.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.user).toEqual(mockUser);
      expect(authApiMock.me).toHaveBeenCalled();
    });

    it('tries refresh when accessToken is expired', async () => {
      localStorageStore['user'] = JSON.stringify(mockUser);
      localStorageStore['accessToken'] = 'expired-access-token';
      authApiMock.me
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(mockUser);
      authApiMock.refresh.mockResolvedValue({ accessToken: 'new-access-token' });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(authApiMock.refresh).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
    });

    it('clears storage when refresh also fails', async () => {
      localStorageStore['user'] = JSON.stringify(mockUser);
      localStorageStore['accessToken'] = 'expired-access-token';
      authApiMock.me.mockRejectedValue({ response: { status: 401 } });
      authApiMock.refresh.mockRejectedValue({ response: { status: 401 } });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.user).toBeNull();
    });

    it('sets isLoading to false when no user in localStorage', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.user).toBeNull();
      expect(authApiMock.me).not.toHaveBeenCalled();
      expect(authApiMock.refresh).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('stores accessToken and user in localStorage', async () => {
      const mockResponse = { accessToken: 'new-token', user: mockUser };
      authApiMock.login.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.login('test@test.com', 'password');
      });

      expect(localStorageStore['accessToken']).toBe('new-token');
      expect(localStorageStore['user']).toBe(JSON.stringify(mockUser));
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('register', () => {
    it('stores accessToken and user in localStorage', async () => {
      const mockResponse = { accessToken: 'register-token', user: mockUser };
      authApiMock.register.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.register('test@test.com', 'password', 'Test');
      });

      expect(localStorageStore['accessToken']).toBe('register-token');
      expect(localStorageStore['user']).toBe(JSON.stringify(mockUser));
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('loginWithTokens', () => {
    it('stores accessToken and user in localStorage', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.loginWithTokens('oauth-token', mockUser);
      });

      expect(localStorageStore['accessToken']).toBe('oauth-token');
      expect(localStorageStore['user']).toBe(JSON.stringify(mockUser));
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('clears localStorage and calls backend logout', async () => {
      localStorageStore['user'] = JSON.stringify(mockUser);
      localStorageStore['accessToken'] = 'some-token';
      authApiMock.logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.logout();
      });

      expect(authApiMock.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('is true when user is set', async () => {
      localStorageStore['user'] = JSON.stringify(mockUser);
      localStorageStore['accessToken'] = 'valid-token';
      authApiMock.me.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('is false when user is null', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
