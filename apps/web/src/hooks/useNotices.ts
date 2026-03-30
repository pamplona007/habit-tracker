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
    onMutate: async ({ householdId, notice }) => {
      const queryKey = NOTICE_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Notice[]>(queryKey);
      const optimisticNotice: Notice = {
        id: `optimistic-${Date.now()}`,
        title: notice.title,
        content: notice.content,
        priority: notice.priority ?? 'normal',
        isActive: true,
        startDate: notice.startDate ?? null,
        endDate: notice.endDate ?? null,
        householdId,
        createdAt: new Date().toISOString(),
        createdBy: '',
      };
      queryClient.setQueryData<Notice[]>(queryKey, (old) => [...(old ?? []), optimisticNotice]);
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<Notice[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
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
    onMutate: async ({ householdId, noticeId, updates }) => {
      const queryKey = NOTICE_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Notice[]>(queryKey);
      queryClient.setQueryData<Notice[]>(queryKey, (old) =>
        (old ?? []).map((n) => (n.id === noticeId ? { ...n, ...updates } : n))
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<Notice[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all(variables.householdId) });
    },
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; noticeId: string }) =>
      noticesApi.delete(params.householdId, params.noticeId),
    onMutate: async ({ householdId, noticeId }) => {
      const queryKey = NOTICE_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Notice[]>(queryKey);
      queryClient.setQueryData<Notice[]>(queryKey, (old) =>
        (old ?? []).filter((n) => n.id !== noticeId)
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<Notice[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all(variables.householdId) });
    },
  });
}
