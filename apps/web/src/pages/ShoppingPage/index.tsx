import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import styles from './styles.module.scss';

export function ShoppingPage() {
  const { t } = useTranslation();
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
    <div data-testid="shopping-page">
      <PageHeader
        title={t('shopping.title')}
        subtitle={`${lists?.length || 0} ${t('shopping.title')}`}
        action={{
          label: t('shopping.newList'),
          icon: <span className="material-symbols-outlined">add</span>,
          onClick: () => setShowCreateListModal(true),
          testId: 'create-list-btn',
        }}
      />

      {isLoading ? (
        <LoadingState message={t('shopping.loadingLists')} />
      ) : lists?.length === 0 ? (
        <EmptyState
          icon="shopping_cart"
          title={t('shopping.noShoppingLists')}
          description={t('shopping.createFirstShoppingList')}
          action={{
            label: t('shopping.createShoppingList'),
            onClick: () => setShowCreateListModal(true),
          }}
        />
      ) : (
        <div className={styles.content} data-testid="shopping-content">
          <div className={styles.lists} data-testid="shopping-lists">
            {lists?.map((list) => (
              <button
                key={list.id}
                className={`${styles.listCard} ${activeList?.id === list.id ? styles.active : ''}`}
                onClick={() => setSelectedList(list.id)}
                data-testid={`shopping-list-${list.id}`}
              >
                <div className={styles.listInfo}>
                  <span className={styles.listName}>{list.name}</span>
                  <span className={styles.listCount}>
                    {list.items.filter((i) => i.isChecked).length}/{list.items.length} {t('shopping.itemsCount')}
                  </span>
                </div>
                <button
                  className={styles.deleteListBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteListId(list.id);
                  }}
                  data-testid={`delete-list-btn-${list.id}`}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </button>
            ))}
          </div>

          {activeList && (
            <div className={styles.listDetail} data-testid="shopping-list-detail">
              <div className={styles.listHeader}>
                <h2 data-testid="active-list-name">{activeList.name}</h2>
                <span className={styles.progress} data-testid="shopping-progress">
                  {checkedCount}/{totalCount}
                </span>
              </div>

              <form onSubmit={handleAddItem} className={styles.addItemForm} data-testid="add-item-form">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={t('shopping.addItemPlaceholder')}
                  className={styles.addItemInput}
                  data-testid="add-item-input"
                />
                <button type="submit" className={styles.addItemBtn} data-testid="add-item-btn">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </form>

              <div className={styles.itemsList} data-testid="shopping-items-list">
                {activeList.items.length === 0 ? (
                  <div className={styles.noItems} data-testid="no-items-message">
                    <p>{t('shopping.noItemsYet')}</p>
                  </div>
                ) : (
                  activeList.items.map((item) => (
                    <div key={item.id} className={`${styles.itemCard} ${item.isChecked ? styles.checked : ''}`} data-testid={`shopping-item-${item.id}`}>
                      <button
                        className={styles.checkBtn}
                        onClick={() => toggleItem.mutateAsync({ householdId, listId: activeList.id, itemId: item.id })}
                        data-testid={`toggle-item-btn-${item.id}`}
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
                        data-testid={`delete-item-btn-${item.id}`}
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
        title={t('shopping.deleteShoppingList')}
        message={t('shopping.deleteShoppingListMessage')}
        confirmLabel={t('shopping.delete')}
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
  const { t } = useTranslation();
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
      title={t('shopping.newShoppingList')}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} data-testid="cancel-list-btn">{t('common.cancel')}</Button>
          <Button type="submit" form="create-list-form" loading={createList.isPending} data-testid="create-list-submit-btn">
            {t('shopping.createShoppingList')}
          </Button>
        </>
      }
    >
      <form id="create-list-form" onSubmit={handleSubmit} data-testid="create-list-form">
        <FormField label={t('shopping.listName')}>
          <InputField
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('shopping.weeklyGroceriesPlaceholder')}
            required
            data-testid="list-name-input"
          />
        </FormField>
      </form>
    </Modal>
  );
}
