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
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function onRefreshSuccess(newToken: string): void {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

function onRefreshFailure(): void {
  refreshSubscribers.forEach(callback => callback('REJECTED'));
  refreshSubscribers = [];
}

export const unauthenticatedApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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

      const isAuthWithoutRefresh =
        isAuthEndpoint &&
        !url?.includes('/auth/refresh') &&
        !url?.includes('/auth/me');

      if (isAuthWithoutRefresh) {
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(error);
      }

      (originalRequest as any)._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            if (token === 'REJECTED') {
              reject(error);
              return;
            }
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {



        const response = await unauthenticatedApi.post<{ accessToken: string }>('/auth/refresh');

        localStorage.setItem('accessToken', response.data.accessToken);
        setAccessToken(response.data.accessToken);

        onRefreshSuccess(response.data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        onRefreshFailure();
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
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
