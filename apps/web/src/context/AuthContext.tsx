import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authApi } from '../api/auth';
import { setAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTokens: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRefreshToken, setHasRefreshToken] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (refreshToken && storedUser) {
        setHasRefreshToken(true);
        try {

          const response = await authApi.refresh(refreshToken);
          setAccessToken(response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          setUser(JSON.parse(storedUser));
        } catch {

          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setAccessToken(null);
          setHasRefreshToken(false);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    setAccessToken(response.accessToken);
    setUser(response.user);
    setHasRefreshToken(true);
  };

  const loginWithTokens = async (accessToken: string, refreshToken: string, user: User) => {
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setAccessToken(accessToken);
    setUser(user);
    setHasRefreshToken(true);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authApi.register(email, password, name);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    setAccessToken(response.accessToken);
    setUser(response.user);
    setHasRefreshToken(true);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    await authApi.logout(refreshToken || undefined);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setAccessToken(null);
    setUser(null);
    setHasRefreshToken(false);
  };

  const refreshUser = async () => {
    const userData = await authApi.me();
    setUser(userData);
  };

  const isAuthenticated = !!user || (hasRefreshToken && isLoading);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        loginWithTokens,
        register,
        logout,
        refreshUser,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
