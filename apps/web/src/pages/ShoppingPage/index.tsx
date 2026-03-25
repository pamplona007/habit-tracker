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
import styles from './styles.module.css';

export function ShoppingPage() {
  const { user } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const { data: lists, isLoading } = useShoppingLists(householdId);
  const deleteList = useDeleteShoppingList();
  const addItem = useAddShoppingItem();
  const toggleItem = useToggleShoppingItem();
  const deleteItem = useDeleteShoppingItem();

  const activeList = lists?.find((l) => l.id === selectedList) || lists?.[0];
  const checkedCount = activeList?.items.filter((i) => i.isChecked).length || 0;
  const totalCount = activeList?.items.length || 0;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList || !newItemName.trim()) return;
    await addItem.mutateAsync({
      householdId,
      listId: activeList.id,
      name: newItemName.trim(),
    });
    setNewItemName('');
  };

  const handleDeleteList = async (listId: string) => {
    if (window.confirm('Delete this shopping list?')) {
      await deleteList.mutateAsync({ householdId, listId });
      setSelectedList(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Shopping</h1>
          <p className={styles.subtitle}>
            {lists?.length || 0} lists
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowCreateListModal(true)}>
          <span className="material-symbols-outlined">add</span>
          New list
        </button>
      </header>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading lists...</p>
        </div>
      ) : lists?.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-symbols-outlined">shopping_cart</span>
          <h3>No shopping lists</h3>
          <p>Create your first shopping list to get started</p>
          <button className={styles.createBtn} onClick={() => setShowCreateListModal(true)}>
            Create list
          </button>
        </div>
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
                    handleDeleteList(list.id);
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

      {showCreateListModal && (
        <CreateListModal
          householdId={householdId}
          onClose={() => setShowCreateListModal(false)}
          onCreated={(id) => {
            setSelectedList(id);
            setShowCreateListModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateListModal({
  householdId,
  onClose,
  onCreated,
}: {
  householdId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const createList = useCreateShoppingList();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = await createList.mutateAsync({ householdId, name });
    onCreated(list.id);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>New shopping list</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label>List name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly groceries"
              required
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={createList.isPending}>
              {createList.isPending ? <span className={styles.spinner} /> : 'Create list'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
