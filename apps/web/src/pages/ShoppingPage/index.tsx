import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  useShoppingLists,
  useCreateShoppingList,
  useDeleteShoppingList,
  useAddShoppingItem,
  useToggleShoppingItem,
  useDeleteShoppingItem,
} from '../../hooks';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField, InputField } from '../../components/FormField';
import { Button } from '../../components/Button';
import styles from './styles.module.css';

export function ShoppingPage() {
  const { user } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [deleteListId, setDeleteListId] = useState<string | null>(null);

  const { data: lists, isLoading } = useShoppingLists(householdId);
  const deleteList = useDeleteShoppingList();
  const addItem = useAddShoppingItem();
  const toggleItem = useToggleShoppingItem();
  const deleteItem = useDeleteShoppingItem();

  const activeList = lists?.find((l) => l.id === selectedList) || lists?.[0];
  const checkedCount = activeList?.items.filter((i) => i.isChecked).length || 0;
  const totalCount = activeList?.items.length || 0;

  const handleAddItem = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!activeList || !newItemName.trim()) return;
    await addItem.mutateAsync({
      householdId,
      listId: activeList.id,
      name: newItemName.trim(),
    });
    setNewItemName('');
  };

  const handleDeleteList = async () => {
    if (deleteListId) {
      await deleteList.mutateAsync({ householdId, listId: deleteListId });
      setDeleteListId(null);
      if (selectedList === deleteListId) {
        setSelectedList(null);
      }
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Shopping"
        subtitle={`${lists?.length || 0} lists`}
        action={{
          label: 'New list',
          icon: <span className="material-symbols-outlined">add</span>,
          onClick: () => setShowCreateListModal(true),
        }}
      />

      {isLoading ? (
        <LoadingState message="Loading lists..." />
      ) : lists?.length === 0 ? (
        <EmptyState
          icon="shopping_cart"
          title="No shopping lists"
          description="Create your first shopping list to get started"
          action={{
            label: 'Create list',
            onClick: () => setShowCreateListModal(true),
          }}
        />
      ) : (
        <div className={styles.content}>
          <div className={styles.lists}>
            {lists?.map((list) => (
              <button
                key={list.id}
                className={`${styles.listCard} ${activeList?.id === list.id ? styles.active : ''}`}
                onClick={() => setSelectedList(list.id)}
              >
                <div className={styles.listInfo}>
                  <span className={styles.listName}>{list.name}</span>
                  <span className={styles.listCount}>
                    {list.items.filter((i) => i.isChecked).length}/{list.items.length} items
                  </span>
                </div>
                <button
                  className={styles.deleteListBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteListId(list.id);
                  }}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </button>
            ))}
          </div>

          {activeList && (
            <div className={styles.listDetail}>
              <div className={styles.listHeader}>
                <h2>{activeList.name}</h2>
                <span className={styles.progress}>
                  {checkedCount}/{totalCount}
                </span>
              </div>

              <form onSubmit={handleAddItem} className={styles.addItemForm}>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Add item..."
                  className={styles.addItemInput}
                />
                <button type="submit" className={styles.addItemBtn}>
                  <span className="material-symbols-outlined">add</span>
                </button>
              </form>

              <div className={styles.itemsList}>
                {activeList.items.length === 0 ? (
                  <div className={styles.noItems}>
                    <p>No items yet. Add your first item above.</p>
                  </div>
                ) : (
                  activeList.items.map((item) => (
                    <div key={item.id} className={`${styles.itemCard} ${item.isChecked ? styles.checked : ''}`}>
                      <button
                        className={styles.checkBtn}
                        onClick={() => toggleItem.mutateAsync({ householdId, listId: activeList.id, itemId: item.id })}
                      >
                        <span className="material-symbols-outlined">
                          {item.isChecked ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </button>
                      <span className={styles.itemName}>{item.name}</span>
                      {item.quantity && (
                        <span className={styles.itemQty}>{item.quantity}</span>
                      )}
                      <button
                        className={styles.deleteItemBtn}
                        onClick={() => deleteItem.mutateAsync({ householdId, listId: activeList.id, itemId: item.id })}
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <CreateListModal
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        householdId={householdId}
        onCreated={(id) => {
          setSelectedList(id);
        }}
      />

      <ConfirmDialog
        isOpen={deleteListId !== null}
        onClose={() => setDeleteListId(null)}
        onConfirm={handleDeleteList}
        title="Delete shopping list?"
        message="This will remove the list and all its items."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function CreateListModal({
  isOpen,
  onClose,
  householdId,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const createList = useCreateShoppingList();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const list = await createList.mutateAsync({ householdId, name });
    setName('');
    onCreated(list.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New shopping list"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="create-list-form" loading={createList.isPending}>
            Create list
          </Button>
        </>
      }
    >
      <form id="create-list-form" onSubmit={handleSubmit}>
        <FormField label="List name">
          <InputField
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Weekly groceries"
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}
