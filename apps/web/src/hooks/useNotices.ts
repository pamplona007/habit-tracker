import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noticesApi } from '../api/notices';
import type { Notice, NoticePriority } from '../types';

export const NOTICE_KEYS = {
  all: (householdId: string) => ['households', householdId, 'notices'] as const,
};

export function useNotices(householdId: string) {
  return useQuery({
    queryKey: NOTICE_KEYS.all(householdId),
    queryFn: () => noticesApi.list(householdId),
    enabled: !!householdId,
  });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      householdId: string;
      notice: {
        title: string;
        content: string;
        priority?: NoticePriority;
        startDate?: string;
        endDate?: string;
      };
    }) => noticesApi.create(params.householdId, params.notice),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all(variables.householdId) });
    },
  });
}

export function useUpdateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      householdId: string;
      noticeId: string;
      updates: Partial<Notice>;
    }) => noticesApi.update(params.householdId, params.noticeId, params.updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all(variables.householdId) });
    },
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; noticeId: string }) =>
      noticesApi.delete(params.householdId, params.noticeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all(variables.householdId) });
    },
  });
}
