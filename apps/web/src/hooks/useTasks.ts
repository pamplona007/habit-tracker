import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi, type TaskType } from '../api'

export const TASK_KEYS = {
  all: (householdId: string) => ['households', householdId, 'tasks'] as const,
  filtered: (householdId: string, type: TaskType) =>
    ['households', householdId, 'tasks', { type }] as const,
}

export function useTasks(householdId: string | null, type?: TaskType) {
  return useQuery({
    queryKey: type ? TASK_KEYS.filtered(householdId!, type) : TASK_KEYS.all(householdId!),
    queryFn: () => tasksApi.list(householdId!, type),
    enabled: Boolean(householdId),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ householdId, data }: { householdId: string; data: Parameters<typeof tasksApi.create>[1] }) =>
      tasksApi.create(householdId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(vars.householdId) })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      householdId,
      taskId,
      data,
    }: {
      householdId: string
      taskId: string
      data: Parameters<typeof tasksApi.update>[2]
    }) => tasksApi.update(householdId, taskId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(vars.householdId) })
    },
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      householdId,
      taskId,
      type,
    }: {
      householdId: string
      taskId: string
      type?: 'FULL' | 'PARTIAL'
    }) => tasksApi.complete(householdId, taskId, type),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(vars.householdId) })
    },
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ householdId, taskId }: { householdId: string; taskId: string }) =>
      tasksApi.toggleComplete(householdId, taskId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(vars.householdId) })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ householdId, taskId }: { householdId: string; taskId: string }) =>
      tasksApi.delete(householdId, taskId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all(vars.householdId) })
    },
  })
}
