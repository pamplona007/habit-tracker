import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotices, useCreateNotice, useDeleteNotice } from '../../hooks';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField, InputField, TextareaField } from '../../components/FormField';
import { Button } from '../../components/Button';
import type { NoticePriority } from '../../types';
import styles from './styles.module.css';

const PRIORITIES: NoticePriority[] = ['low', 'normal', 'high', 'urgent'];

export function NoticesPage() {
  const { user } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);
  const [deleteNoticeId, setDeleteNoticeId] = useState<string | null>(null);

  const { data: notices, isLoading } = useNotices(householdId);
  const deleteNotice = useDeleteNotice();

  const handleDelete = async () => {
    if (deleteNoticeId) {
      await deleteNotice.mutateAsync({ householdId, noticeId: deleteNoticeId });
      setDeleteNoticeId(null);
    }
  };

  const activeNotices = notices?.filter((n) => n.isActive) || [];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Notices"
        subtitle={`${activeNotices.length} active notices`}
        action={{
          label: 'Add notice',
          icon: <span className="material-symbols-outlined">add</span>,
          onClick: () => setShowCreateModal(true),
        }}
      />

      {isLoading ? (
        <LoadingState message="Loading notices..." />
      ) : activeNotices.length === 0 ? (
        <EmptyState
          icon="campaign"
          title="No notices yet"
          description="Create your first notice to share with your household"
          action={{
            label: 'Create notice',
            onClick: () => setShowCreateModal(true),
          }}
        />
      ) : (
        <div className={styles.noticeList}>
          {activeNotices.map((notice) => (
            <div key={notice.id} className={`${styles.noticeCard} ${styles[notice.priority]}`}>
              <div className={styles.noticeHeader}>
                <span className={styles.priorityBadge}>{notice.priority}</span>
                <span className={styles.noticeDate}>
                  {new Date(notice.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className={styles.noticeTitle}>{notice.title}</h3>
              <p className={`${styles.noticeContent} ${expandedNotice === notice.id ? styles.expanded : ''}`}>
                {notice.content}
              </p>
              {notice.content.length > 100 && (
                <button
                  className={styles.expandBtn}
                  onClick={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                >
                  {expandedNotice === notice.id ? 'Show less' : 'Show more'}
                </button>
              )}
              <div className={styles.noticeActions}>
                <button className={styles.deleteBtn} onClick={() => setDeleteNoticeId(notice.id)}>
                  <span className="material-symbols-outlined">delete</span>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateNoticeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        householdId={householdId}
      />

      <ConfirmDialog
        isOpen={deleteNoticeId !== null}
        onClose={() => setDeleteNoticeId(null)}
        onConfirm={handleDelete}
        title="Delete notice?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function CreateNoticeModal({
  isOpen,
  onClose,
  householdId,
}: {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<NoticePriority>('normal');
  const createNotice = useCreateNotice();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    await createNotice.mutateAsync({
      householdId,
      notice: { title, content, priority },
    });
    setTitle('');
    setContent('');
    setPriority('normal');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create notice"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="create-notice-form" loading={createNotice.isPending}>
            Create notice
          </Button>
        </>
      }
    >
      <form id="create-notice-form" onSubmit={handleSubmit}>
        <FormField label="Title">
          <InputField
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Important announcement"
            required
          />
        </FormField>

        <FormField label="Content">
          <TextareaField
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your notice here..."
            rows={4}
            required
          />
        </FormField>

        <FormField label="Priority">
          <div className={styles.priorityOptions}>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.priorityOption} ${styles[p]} ${priority === p ? styles.active : ''}`}
                onClick={() => setPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </FormField>
      </form>
    </Modal>
  );
}