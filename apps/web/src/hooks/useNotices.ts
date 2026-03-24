import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { noticesApi } from '../api'

export const NOTICE_KEYS = {
  all: (householdId: string) => ['households', householdId, 'notices'] as const,
}

export function useNotices(householdId: string | null) {
  return useQuery({
    queryKey: NOTICE_KEYS.all(householdId!),
    queryFn: () => noticesApi.list(householdId!),
    enabled: Boolean(householdId),
  })
}

export function useCreateNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      householdId,
      data,
    }: {
      householdId: string
      data: Parameters<typeof noticesApi.create>[1]
    }) => noticesApi.create(householdId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all(vars.householdId) })
    },
  })
}

export function useUpdateNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      householdId,
      noticeId,
      data,
    }: {
      householdId: string
      noticeId: string
      data: Parameters<typeof noticesApi.update>[2]
    }) => noticesApi.update(householdId, noticeId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all(vars.householdId) })
    },
  })
}

export function useDeleteNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ householdId, noticeId }: { householdId: string; noticeId: string }) =>
      noticesApi.delete(householdId, noticeId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all(vars.householdId) })
    },
  })
}
