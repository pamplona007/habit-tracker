import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';
import type { Task, TaskType, CompletionType, TaskPriority } from '../types';
import { calculateStreak, type Streak } from '../utils/streak';

export const TASK_KEYS = {
  all: (householdId: string) => ['households', householdId, 'tasks'] as const,
  byType: (householdId: string, type: TaskType) =>
    ['households', householdId, 'tasks', { type }] as const,
};

export function useTasks(householdId: string, type?: TaskType) {
  return useQuery({
    queryKey: type ? TASK_KEYS.byType(householdId, type) : TASK_KEYS.all(householdId),
    queryFn: () => tasksApi.list(householdId, type),
    enabled: !!householdId,
  });
}

export function useStreak(tasks: Task[] | undefined): Streak {
  return calculateStreak(tasks || []);
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
    onSuccess: (_, variables) => {
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(variables.householdId) });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; taskId: string; type: CompletionType }) =>
      tasksApi.complete(params.householdId, params.taskId, params.type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(variables.householdId) });
    },
  });
}

export function useUncompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; taskId: string }) =>
      tasksApi.uncomplete(params.householdId, params.taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(variables.householdId) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; taskId: string }) =>
      tasksApi.delete(params.householdId, params.taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(variables.householdId) });
    },
  });
}
