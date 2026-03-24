import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { shoppingApi } from '../api'

export const SHOPPING_KEYS = {
  all: (householdId: string) => ['households', householdId, 'shopping'] as const,
  one: (householdId: string, listId: string) =>
    ['households', householdId, 'shopping', listId] as const,
}

export function useShoppingLists(householdId: string | null) {
  return useQuery({
    queryKey: SHOPPING_KEYS.all(householdId!),
    queryFn: () => shoppingApi.list(householdId!),
    enabled: Boolean(householdId),
  })
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ householdId, name }: { householdId: string; name: string }) =>
      shoppingApi.createList(householdId, name),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(vars.householdId) })
    },
  })
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ householdId, listId }: { householdId: string; listId: string }) =>
      shoppingApi.deleteList(householdId, listId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(vars.householdId) })
    },
  })
}

export function useAddShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      householdId,
      listId,
      name,
      quantity = 1,
    }: {
      householdId: string
      listId: string
      name: string
      quantity?: number
    }) => shoppingApi.addItem(householdId, listId, name, quantity),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(vars.householdId) })
    },
  })
}

export function useToggleShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      householdId,
      listId,
      itemId,
    }: {
      householdId: string
      listId: string
      itemId: string
    }) => shoppingApi.toggleItem(householdId, listId, itemId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(vars.householdId) })
    },
  })
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      householdId,
      listId,
      itemId,
    }: {
      householdId: string
      listId: string
      itemId: string
    }) => shoppingApi.deleteItem(householdId, listId, itemId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(vars.householdId) })
    },
  })
}
