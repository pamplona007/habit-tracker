import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { householdsApi } from '../api'
import { AUTH_KEYS } from './useAuth'

export const HOUSEHOLD_KEYS = {
  all: ['households'] as const,
  one: (id: string) => ['households', id] as const,
}

export function useHouseholds() {
  return useQuery({
    queryKey: HOUSEHOLD_KEYS.all,
    queryFn: householdsApi.list,
  })
}

export function useHousehold(id: string | null) {
  return useQuery({
    queryKey: HOUSEHOLD_KEYS.one(id!),
    queryFn: () => householdsApi.get(id!),
    enabled: Boolean(id),
  })
}

export function useCreateHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: householdsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.all })
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me })
    },
  })
}

export function useJoinHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: householdsApi.join,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.all })
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me })
    },
  })
}

export function useSwitchHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: householdsApi.switch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.all })
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me })
    },
  })
}

export function useLeaveHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: householdsApi.leave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.all })
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me })
    },
  })
}

export function useCreateInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      householdId,
      expiresInHours,
    }: {
      householdId: string
      expiresInHours?: number
    }) => householdsApi.createInvite(householdId, expiresInHours),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.one(vars.householdId) })
    },
  })
}
