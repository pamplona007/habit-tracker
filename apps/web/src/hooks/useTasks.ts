import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';
import { streakApi } from '../api/streak';
import type { Task, TaskType, CompletionType, TaskPriority } from '../types';

export const TASK_KEYS = {
  all: (householdId: string) => ['households', householdId, 'tasks'] as const,
  byType: (householdId: string, type: TaskType) =>
    ['households', householdId, 'tasks', { type }] as const,
};

export const STREAK_KEYS = {
  all: (householdId: string) => ['households', householdId, 'streak'] as const,
};

export function useTasks(householdId: string, type?: TaskType) {
  return useQuery({
    queryKey: type ? TASK_KEYS.byType(householdId, type) : TASK_KEYS.all(householdId),
    queryFn: () => tasksApi.list(householdId, type),
    enabled: !!householdId,
  });
}

export function useStreak(householdId: string) {
  return useQuery({
    queryKey: STREAK_KEYS.all(householdId),
    queryFn: () => streakApi.get(householdId),
    enabled: !!householdId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      householdId: string;
      task: {
        name: string;
        description?: string;
        type: TaskType;
        dayOfWeek?: number;
        dayOfMonth?: number;
        deadline?: string;
        priority?: TaskPriority;
      };
    }) => tasksApi.create(params.householdId, params.task),
    onMutate: async ({ householdId, task }) => {
      const queryKey = TASK_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Task[]>(queryKey);
      const optimisticTask: Task = {
        id: `optimistic-${Date.now()}`,
        name: task.name,
        description: task.description ?? null,
        type: task.type,
        priority: task.priority ?? 'normal',
        dayOfWeek: task.dayOfWeek ?? null,
        dayOfMonth: task.dayOfMonth ?? null,
        deadline: task.deadline ?? null,
        isActive: true,
        householdId,
        createdAt: new Date().toISOString(),
        completed: false,
        completionType: null,
      };
      queryClient.setQueryData<Task[]>(queryKey, (old) => [...(old ?? []), optimisticTask]);
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<Task[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(variables.householdId) });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      householdId: string;
      taskId: string;
      updates: Partial<Task>;
    }) => tasksApi.update(params.householdId, params.taskId, params.updates),
    onMutate: async ({ householdId, taskId, updates }) => {
      const queryKey = TASK_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Task[]>(queryKey);
      queryClient.setQueryData<Task[]>(queryKey, (old) =>
        (old ?? []).map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<Task[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(variables.householdId) });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; taskId: string; type: CompletionType }) =>
      tasksApi.complete(params.householdId, params.taskId, params.type),
    onMutate: async ({ householdId, taskId, type }) => {
      const queryKey = TASK_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Task[]>(queryKey);
      queryClient.setQueryData<Task[]>(queryKey, (old) =>
        (old ?? []).map((t) =>
          t.id === taskId ? { ...t, completed: true, completionType: type } : t
        )
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<Task[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(variables.householdId) });
      queryClient.invalidateQueries({ queryKey: STREAK_KEYS.all(variables.householdId) });
    },
  });
}

export function useUncompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; taskId: string }) =>
      tasksApi.uncomplete(params.householdId, params.taskId),
    onMutate: async ({ householdId, taskId }) => {
      const queryKey = TASK_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Task[]>(queryKey);
      queryClient.setQueryData<Task[]>(queryKey, (old) =>
        (old ?? []).map((t) =>
          t.id === taskId ? { ...t, completed: false, completionType: null } : t
        )
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<Task[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(variables.householdId) });
      queryClient.invalidateQueries({ queryKey: STREAK_KEYS.all(variables.householdId) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; taskId: string }) =>
      tasksApi.delete(params.householdId, params.taskId),
    onMutate: async ({ householdId, taskId }) => {
      const queryKey = TASK_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Task[]>(queryKey);
      queryClient.setQueryData<Task[]>(queryKey, (old) =>
        (old ?? []).filter((t) => t.id !== taskId)
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<Task[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(variables.householdId) });
    },
  });
}
