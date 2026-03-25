import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingApi } from '../api/shopping';
import type { ShoppingItem } from '../types';

export const SHOPPING_KEYS = {
  all: (householdId: string) => ['households', householdId, 'shopping'] as const,
};

export function useShoppingLists(householdId: string) {
  return useQuery({
    queryKey: SHOPPING_KEYS.all(householdId),
    queryFn: () => shoppingApi.list(householdId),
    enabled: !!householdId,
  });
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; name: string }) =>
      shoppingApi.createList(params.householdId, params.name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; listId: string }) =>
      shoppingApi.deleteList(params.householdId, params.listId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}

export function useAddShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; listId: string; name: string; quantity?: string }) =>
      shoppingApi.addItem(params.householdId, params.listId, params.name, params.quantity),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}

export function useUpdateShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      householdId: string;
      listId: string;
      itemId: string;
      updates: Partial<ShoppingItem>;
    }) => shoppingApi.updateItem(params.householdId, params.listId, params.itemId, params.updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; listId: string; itemId: string }) =>
      shoppingApi.deleteItem(params.householdId, params.listId, params.itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}

export function useToggleShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; listId: string; itemId: string }) =>
      shoppingApi.toggleItem(params.householdId, params.listId, params.itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}
