import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
  Checkbox,
  Progress,
  Dialog,
} from '@radix-ui/themes'
import { useAuth } from '../../context'
import {
  useShoppingLists,
  useCreateShoppingList,
  useAddShoppingItem,
  useToggleShoppingItem,
  useDeleteShoppingList,
} from '../../hooks'
import type { ShoppingList, ShoppingItem } from '../../api'
import styles from './styles.module.css'

export function ShoppingTab() {
  const { user } = useAuth()
  const householdId = user?.currentHouseholdId ?? null
  const { data: lists = [], isLoading } = useShoppingLists(householdId)
  const createList = useCreateShoppingList()
  const addItem = useAddShoppingItem()
  const toggleItem = useToggleShoppingItem()
  const deleteList = useDeleteShoppingList()

  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState(1)
  const [newListName, setNewListName] = useState('')
  const [createListOpen, setCreateListOpen] = useState(false)

  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0] ?? null

  if (!activeListId && lists.length > 0 && activeList) {
    setActiveListId(activeList.id)
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemName.trim() || !householdId || !activeList) return
    addItem.mutate(
      { householdId, listId: activeList.id, name: newItemName.trim(), quantity: newItemQty },
      { onSuccess: () => { setNewItemName(''); setNewItemQty(1) } }
    )
  }

  function handleToggle(itemId: string) {
    if (!householdId || !activeList) return
    toggleItem.mutate({ householdId, listId: activeList.id, itemId })
  }

  function handleCreateList() {
    if (!newListName.trim() || !householdId) return
    createList.mutate(
      { householdId, name: newListName.trim() },
      { onSuccess: (newList) => { setActiveListId(newList.id); setCreateListOpen(false); setNewListName('') } }
    )
  }

  function handleDeleteList(listId: string) {
    if (!householdId) return
    deleteList.mutate({ householdId, listId })
    if (activeListId === listId) setActiveListId(null)
  }

  function getListProgress(list: ShoppingList): number {
    if (list.items.length === 0) return 0
    const checked = list.items.filter((i) => i.isChecked).length
    return Math.round((checked / list.items.length) * 100)
  }

  return (
    <Flex direction="column" gap="4" className={styles.container}>
      <Flex justify="between" align="center">
        <Heading size="5">🛒 Compras</Heading>
        <Button size="2" onClick={() => setCreateListOpen(true)}>
          + Nova lista
        </Button>
      </Flex>

      {isLoading && <Text color="gray">Carregando...</Text>}

      {lists.length === 0 && !isLoading && (
        <Card className={styles.emptyCard}>
          <Text color="gray" size="2">
            Nenhuma lista ainda. Crie uma para começar!
          </Text>
        </Card>
      )}

      {lists.length > 0 && (
        <>
          {/* List tabs */}
          <Flex gap="1" className={styles.listTabs} wrap="wrap">
            {lists.map((list) => (
              <Box
                key={list.id}
                className={`${styles.listTab} ${activeList?.id === list.id ? styles.listTabActive : ''}`}
                onClick={() => setActiveListId(list.id)}
              >
                <Text size="2" weight={activeList?.id === list.id ? 'bold' : 'regular'}>
                  {list.name}
                </Text>
                <Text size="1" color="gray">
                  {list.items.filter((i) => i.isChecked).length}/{list.items.length}
                </Text>
              </Box>
            ))}
          </Flex>

          {activeList && (
            <>
              {/* Progress */}
              <Box>
                <Flex justify="between" mb="1">
                  <Text size="1" color="gray">
                    {activeList.items.filter((i) => i.isChecked).length} de {activeList.items.length} itens
                  </Text>
                  <Button size="1" variant="ghost" color="gray" onClick={() => handleDeleteList(activeList.id)}>
                    Eliminar lista
                  </Button>
                </Flex>
                <Progress value={getListProgress(activeList)} size="1" />
              </Box>

              {/* Add item form */}
              <form onSubmit={handleAddItem} className={styles.addItemForm}>
                <TextField.Root
                  placeholder="Nome do item..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className={styles.addItemInput}
                />
                <TextField.Root
                  type="number"
                  min={1}
                  max={99}
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Number(e.target.value))}
                  className={styles.qtyInput}
                />
                <Button type="submit" disabled={!newItemName.trim()}>+</Button>
              </form>

              {/* Items */}
              <Flex direction="column" gap="1">
                {activeList.items.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => handleToggle(item.id)}
                  />
                ))}
                {activeList.items.length === 0 && (
                  <Text size="2" color="gray" style={{ textAlign: 'center', padding: '16px 0' }}>
                    Lista vazia. Adicione itens acima.
                  </Text>
                )}
              </Flex>
            </>
          )}
        </>
      )}

      {/* Create list dialog */}
      <Dialog.Root open={createListOpen} onOpenChange={setCreateListOpen}>
        <Dialog.Content className={styles.dialogContent}>
          <Dialog.Title>Nova lista</Dialog.Title>
          <Flex direction="column" gap="3" mt="2">
            <Box>
              <Text size="2" mb="1" as="label">Nome da lista</Text>
              <TextField.Root
                placeholder="Ex: Supermercado"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                autoFocus
              />
            </Box>
            <Flex justify="end" gap="2" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray">Cancelar</Button>
              </Dialog.Close>
              <Button onClick={handleCreateList} disabled={!newListName.trim()}>Criar</Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  )
}

function ShoppingItemRow({ item, onToggle }: { item: ShoppingItem; onToggle: () => void }) {
  return (
    <Box className={`${styles.itemRow} ${item.isChecked ? styles.itemChecked : ''}`}>
      <Checkbox checked={item.isChecked} onCheckedChange={onToggle} />
      <Text size="2" style={{ flex: 1 }} className={item.isChecked ? styles.itemCheckedText : ''}>
        {item.name}
      </Text>
      {item.quantity > 1 && (
        <Text size="1" color="gray" className={styles.qtyBadge}>×{item.quantity}</Text>
      )}
    </Box>
  )
}
