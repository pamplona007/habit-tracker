import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, LoginRequest, RegisterRequest } from '../services/auth';

const AUTH_KEYS = {
  me: ['auth', 'me'] as const,
};

export function useAuth() {
  const queryClient = useQueryClient();

  const token = localStorage.getItem('token');

  const { data: user, isLoading, error } = useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: authService.me,
    retry: false,
    staleTime: Infinity,
    enabled: !!token,
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (response) => {
      localStorage.setItem('token', response.token);
      queryClient.setQueryData(AUTH_KEYS.me, response.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: (response) => {
      localStorage.setItem('token', response.token);
      queryClient.setQueryData(AUTH_KEYS.me, response.user);
    },
  });

  const logout = () => {
    localStorage.removeItem('token');
    queryClient.clear();
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
