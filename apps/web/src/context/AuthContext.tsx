import { createContext, useContext, type ReactNode } from 'react'
import { useAuthMe, useAuthLogin, useAuthRegister, useLogout } from '../hooks'
import type { User } from '../api'

type AuthStatus = 'loading' | 'unauthenticated' | 'no-household' | 'authenticated'

type AuthContextValue = {
  user: User | null
  status: AuthStatus
  isLoading: boolean
  login: ReturnType<typeof useAuthLogin>['mutate']
  register: ReturnType<typeof useAuthRegister>['mutate']
  logout: ReturnType<typeof useLogout>['mutate']
  loginError: string | null
  registerError: string | null
  isLoggingIn: boolean
  isRegistering: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, error } = useAuthMe()
  const loginMutation = useAuthLogin()
  const registerMutation = useAuthRegister()
  const logoutMutation = useLogout()

  const hasToken = Boolean(localStorage.getItem('auth-token'))

  const status: AuthStatus = isLoading
    ? 'loading'
    : !hasToken || error
    ? 'unauthenticated'
    : !user?.currentHouseholdId
    ? 'no-household'
    : 'authenticated'

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        status,
        isLoading,
        login: loginMutation.mutate,
        register: registerMutation.mutate,
        logout: logoutMutation.mutate,
        loginError: loginMutation.error ? String(loginMutation.error) : null,
        registerError: registerMutation.error ? String(registerMutation.error) : null,
        isLoggingIn: loginMutation.isPending,
        isRegistering: registerMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
