import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingApi } from '../api/shopping';
import type { ShoppingItem, ShoppingList } from '../types';

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
    onMutate: async ({ householdId, name }) => {
      const queryKey = SHOPPING_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShoppingList[]>(queryKey);
      const optimisticList: ShoppingList = {
        id: `optimistic-${Date.now()}`,
        name,
        householdId,
        createdAt: new Date().toISOString(),
        items: [],
      };
      queryClient.setQueryData<ShoppingList[]>(queryKey, (old) => [...(old ?? []), optimisticList]);
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<ShoppingList[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; listId: string }) =>
      shoppingApi.deleteList(params.householdId, params.listId),
    onMutate: async ({ householdId, listId }) => {
      const queryKey = SHOPPING_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShoppingList[]>(queryKey);
      queryClient.setQueryData<ShoppingList[]>(queryKey, (old) =>
        (old ?? []).filter((l) => l.id !== listId)
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<ShoppingList[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}

export function useAddShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; listId: string; name: string; quantity?: string }) =>
      shoppingApi.addItem(params.householdId, params.listId, params.name, params.quantity),
    onMutate: async ({ householdId, listId, name, quantity }) => {
      const queryKey = SHOPPING_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShoppingList[]>(queryKey);
      const optimisticItem: ShoppingItem = {
        id: `optimistic-${Date.now()}`,
        name,
        quantity: quantity ?? null,
        isChecked: false,
        listId,
      };
      queryClient.setQueryData<ShoppingList[]>(queryKey, (old) =>
        (old ?? []).map((list) =>
          list.id === listId ? { ...list, items: [...list.items, optimisticItem] } : list
        )
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<ShoppingList[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
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
    onMutate: async ({ householdId, listId, itemId, updates }) => {
      const queryKey = SHOPPING_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShoppingList[]>(queryKey);
      queryClient.setQueryData<ShoppingList[]>(queryKey, (old) =>
        (old ?? []).map((list) =>
          list.id === listId
            ? { ...list, items: list.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)) }
            : list
        )
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<ShoppingList[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; listId: string; itemId: string }) =>
      shoppingApi.deleteItem(params.householdId, params.listId, params.itemId),
    onMutate: async ({ householdId, listId, itemId }) => {
      const queryKey = SHOPPING_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShoppingList[]>(queryKey);
      queryClient.setQueryData<ShoppingList[]>(queryKey, (old) =>
        (old ?? []).map((list) =>
          list.id === listId ? { ...list, items: list.items.filter((item) => item.id !== itemId) } : list
        )
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<ShoppingList[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}

export function useToggleShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { householdId: string; listId: string; itemId: string }) =>
      shoppingApi.toggleItem(params.householdId, params.listId, params.itemId),
    onMutate: async ({ householdId, listId, itemId }) => {
      const queryKey = SHOPPING_KEYS.all(householdId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShoppingList[]>(queryKey);
      queryClient.setQueryData<ShoppingList[]>(queryKey, (old) =>
        (old ?? []).map((list) =>
          list.id === listId
            ? {
                ...list,
                items: list.items.map((item) =>
                  item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
                ),
              }
            : list
        )
      );
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData<ShoppingList[]>(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEYS.all(variables.householdId) });
    },
  });
}
