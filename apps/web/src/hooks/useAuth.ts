import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, type User } from '../api'

export const AUTH_KEYS = {
  me: ['auth', 'me'] as const,
}

export function useAuthMe() {
  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min
  })
}

export function useAuthRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      localStorage.setItem('auth-token', data.token)
      queryClient.setQueryData<User>(AUTH_KEYS.me, data.user)
    },
  })
}

export function useAuthLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      localStorage.setItem('auth-token', data.token)
      queryClient.setQueryData<User>(AUTH_KEYS.me, data.user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem('auth-token')
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
