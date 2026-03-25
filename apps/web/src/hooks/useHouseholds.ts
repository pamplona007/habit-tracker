import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { householdsApi } from '../api/households';

export const HOUSEHOLD_KEYS = {
  all: ['households'] as const,
  one: (id: string) => ['households', id] as const,
};

export function useHouseholds() {
  return useQuery({
    queryKey: HOUSEHOLD_KEYS.all,
    queryFn: householdsApi.list,
  });
}

export function useHousehold(id: string) {
  return useQuery({
    queryKey: HOUSEHOLD_KEYS.one(id),
    queryFn: () => householdsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => householdsApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.all });
    },
  });
}

export function useJoinHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => householdsApi.join(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.all });
    },
  });
}

export function useSwitchHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => householdsApi.switch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.all });
    },
  });
}

export function useLeaveHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => householdsApi.leave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.all });
    },
  });
}

export function useCreateInvite(householdId: string) {
  return useMutation({
    mutationFn: () => householdsApi.createInvite(householdId),
  });
}

export function useUpdateHousehold(householdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => householdsApi.update(householdId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.one(householdId) });
    },
  });
}

export function useUpdateMemberRole(householdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN' | 'MEMBER' }) =>
      householdsApi.updateMemberRole(householdId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.one(householdId) });
    },
  });
}

export function useRemoveMember(householdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => householdsApi.removeMember(householdId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.one(householdId) });
    },
  });
}
