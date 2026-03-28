import axios from 'axios';
import { authApi } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// In-memory access token (not localStorage)
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Track if we're currently refreshing to prevent concurrent refresh calls
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function onRefreshSuccess(newToken: string): void {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried and not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry) {
      const url = originalRequest?.url;
      const isAuthEndpoint =
        typeof url === 'string' &&
        (url.startsWith('/auth/') || url.startsWith(`${API_URL}/auth/`));

      // Skip refresh for auth endpoints (except refresh itself)
      if (isAuthEndpoint && !url?.includes('/auth/refresh')) {
        // Clear auth and redirect to login
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Mark as retried
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Call refresh endpoint
        const response = await authApi.refresh(refreshToken);

        // Store new tokens
        localStorage.setItem('refreshToken', response.refreshToken);
        setAccessToken(response.accessToken);

        // Notify all queued requests
        onRefreshSuccess(response.accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        // Refresh failed - clear auth and redirect to login
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
