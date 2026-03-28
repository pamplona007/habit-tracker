import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

let isRefreshing = false;
type RefreshSubscriber = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};
let refreshSubscribers: RefreshSubscriber[] = [];

function subscribeTokenRefresh(subscriber: RefreshSubscriber): void {
  refreshSubscribers.push(subscriber);
}

function onRefreshSuccess(newToken: string): void {
  refreshSubscribers.forEach(sub => sub.resolve(newToken));
  refreshSubscribers = [];
}

function onRefreshFailure(error: unknown): void {
  refreshSubscribers.forEach(sub => sub.reject(error));
  refreshSubscribers = [];
}

export const unauthenticatedApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

    if (error.response?.status === 401 && !(originalRequest as any)._retry) {
      const url = originalRequest?.url;
      const isAuthEndpoint =
        typeof url === 'string' &&
        (url.startsWith('/auth/') || url.startsWith(`${API_URL}/auth/`));

      if (isAuthEndpoint && !url?.includes('/auth/refresh')) {
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(error);
      }

      (originalRequest as any)._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: unknown) => {
              reject(err);
            },
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data: response } = await unauthenticatedApi.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken });
        localStorage.setItem('refreshToken', response.refreshToken);
        setAccessToken(response.accessToken);

        onRefreshSuccess(response.accessToken);

        originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        onRefreshFailure(refreshError);

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
