import { apiClient } from './client'

export type ShoppingItem = {
  id: string
  name: string
  quantity: number
  isChecked: boolean
  createdAt: string
  updatedAt: string
}

export type ShoppingList = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  items: ShoppingItem[]
}

export const shoppingApi = {
  list: async (householdId: string) => {
    const res = await apiClient.get<{ lists: ShoppingList[] }>(
      `/households/${householdId}/shopping`
    )
    return res.data.lists
  },

  get: async (householdId: string, listId: string) => {
    const res = await apiClient.get<{ list: ShoppingList }>(
      `/households/${householdId}/shopping/${listId}`
    )
    return res.data.list
  },

  createList: async (householdId: string, name: string) => {
    const res = await apiClient.post<{ list: ShoppingList }>(
      `/households/${householdId}/shopping`,
      { name }
    )
    return res.data.list
  },

  deleteList: async (householdId: string, listId: string) => {
    await apiClient.delete(`/households/${householdId}/shopping/${listId}`)
  },

  addItem: async (householdId: string, listId: string, name: string, quantity = 1) => {
    const res = await apiClient.post<{ item: ShoppingItem }>(
      `/households/${householdId}/shopping/${listId}/items`,
      { name, quantity }
    )
    return res.data.item
  },

  toggleItem: async (householdId: string, listId: string, itemId: string) => {
    const res = await apiClient.patch<{ item: ShoppingItem }>(
      `/households/${householdId}/shopping/${listId}/items/${itemId}`
    )
    return res.data.item
  },

  deleteItem: async (householdId: string, listId: string, itemId: string) => {
    await apiClient.delete(
      `/households/${householdId}/shopping/${listId}/items/${itemId}`
    )
  },
}
