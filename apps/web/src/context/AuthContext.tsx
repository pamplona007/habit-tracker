import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { User } from '../types';
import { authApi } from '../api/auth';
import { setAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTokens: (accessToken: string, user: User) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const storedAccessToken = localStorage.getItem('accessToken');

      if (!storedUser) {
        setIsLoading(false);
        return;
      }

      if (storedAccessToken) {
        setAccessToken(storedAccessToken);
      }

      try {
        const userData = await authApi.me();
        setUser(userData);
      } catch {
        try {
          const response = await authApi.refresh();
          setAccessToken(response.accessToken);
          localStorage.setItem('accessToken', response.accessToken);
          const userResponse = await authApi.me();
          setUser(userResponse);
          localStorage.setItem('user', JSON.stringify(userResponse));
        } catch {
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          setAccessToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    setAccessToken(response.accessToken);
    setUser(response.user);
  };

  const loginWithTokens = async (accessToken: string, user: User) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setAccessToken(accessToken);
    setUser(user);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authApi.register(email, password, name);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    setAccessToken(response.accessToken);
    setUser(response.user);
  };

  const logout = async () => {
    await authApi.logout();
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    setAccessToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const userData = await authApi.me();
    setUser(userData);
  };

  const isAuthenticated = !!user;

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
