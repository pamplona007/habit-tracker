import { apiClient } from './client';
import type { ShoppingList, ShoppingItem } from '../types';

export const shoppingApi = {
  list: async (householdId: string): Promise<ShoppingList[]> => {
    const { data } = await apiClient.get<{ lists: ShoppingList[] }>(`/households/${householdId}/shopping`);
    return data.lists;
  },

  createList: async (householdId: string, name: string): Promise<ShoppingList> => {
    const { data } = await apiClient.post<{ list: ShoppingList }>(`/households/${householdId}/shopping`, { name });
    return data.list;
  },

  deleteList: async (householdId: string, listId: string): Promise<void> => {
    await apiClient.delete(`/households/${householdId}/shopping/${listId}`);
  },

  addItem: async (householdId: string, listId: string, name: string, quantity?: string): Promise<ShoppingItem> => {
    const { data } = await apiClient.post<{ item: ShoppingItem }>(`/households/${householdId}/shopping/${listId}/items`, { name, quantity });
    return data.item;
  },

  updateItem: async (
    householdId: string,
    listId: string,
    itemId: string,
    updates: Partial<ShoppingItem>
  ): Promise<ShoppingItem> => {
    const { data } = await apiClient.patch<{ item: ShoppingItem }>(
      `/households/${householdId}/shopping/${listId}/items/${itemId}`,
      updates
    );
    return data.item;
  },

  deleteItem: async (householdId: string, listId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/households/${householdId}/shopping/${listId}/items/${itemId}`);
  },

  toggleItem: async (householdId: string, listId: string, itemId: string): Promise<ShoppingItem> => {
    const { data } = await apiClient.post<{ item: ShoppingItem }>(
      `/households/${householdId}/shopping/${listId}/items/${itemId}`
    );
    return data.item;
  },
};
