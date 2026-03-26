import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    <div className={styles.page} data-testid="notices-page">
      <PageHeader
        title={t('notices.title')}
        subtitle={`${activeNotices.length} ${t('notices.activeNotices')}`}
        action={{
          label: t('notices.addNotice'),
          icon: <span className="material-symbols-outlined">add</span>,
          onClick: () => setShowCreateModal(true),
          testId: 'add-notice-btn',
        }}
      />

      {isLoading ? (
        <LoadingState message={t('notices.loadingNotices')} />
      ) : activeNotices.length === 0 ? (
        <EmptyState
          icon="campaign"
          title={t('notices.noNoticesYet')}
          description={t('notices.createFirstNotice')}
          action={{
            label: t('notices.create'),
            onClick: () => setShowCreateModal(true),
          }}
        />
      ) : (
        <div className={styles.noticeList} data-testid="notice-list">
          {activeNotices.map((notice) => (
            <div key={notice.id} className={`${styles.noticeCard} ${styles[notice.priority]}`} data-testid={`notice-card-${notice.id}`}>
              <div className={styles.noticeHeader}>
                <span className={styles.priorityBadge} data-testid={`notice-priority-${notice.priority}`}>{t(`notices.priorities.${notice.priority}`)}</span>
                <span className={styles.noticeDate}>
                  {new Date(notice.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className={styles.noticeTitle} data-testid={`notice-title-${notice.id}`}>{notice.title}</h3>
              <p className={`${styles.noticeContent} ${expandedNotice === notice.id ? styles.expanded : ''}`}>
                {notice.content}
              </p>
              {notice.content.length > 100 && (
                <button
                  className={styles.expandBtn}
                  onClick={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                >
                  {expandedNotice === notice.id ? t('notices.showLess') : t('notices.showMore')}
                </button>
              )}
              <div className={styles.noticeActions}>
                <button className={styles.deleteBtn} onClick={() => setDeleteNoticeId(notice.id)} data-testid={`delete-notice-btn-${notice.id}`}>
                  <span className="material-symbols-outlined">delete</span>
                  {t('common.delete')}
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
        title={t('notices.deleteNotice')}
        message={t('common.actionCannotBeUndone')}
        confirmLabel={t('common.delete')}
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
  const { t } = useTranslation();
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
      title={t('notices.create')}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} data-testid="cancel-notice-btn">{t('common.cancel')}</Button>
          <Button type="submit" form="create-notice-form" loading={createNotice.isPending} data-testid="create-notice-submit-btn">
            {t('notices.create')}
          </Button>
        </>
      }
    >
      <form id="create-notice-form" onSubmit={handleSubmit} data-testid="create-notice-form">
        <FormField label={t('notices.name')}>
          <InputField
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('notices.noticeTitlePlaceholder')}
            required
            data-testid="notice-title-input"
          />
        </FormField>

        <FormField label={t('notices.content')}>
          <TextareaField
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('notices.noticeContentPlaceholder')}
            rows={4}
            required
            data-testid="notice-content-input"
          />
        </FormField>

        <FormField label={t('notices.priority')}>
          <div className={styles.priorityOptions} data-testid="notice-priority-options">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.priorityOption} ${styles[p]} ${priority === p ? styles.active : ''}`}
                onClick={() => setPriority(p)}
                data-testid={`notice-priority-${p}`}
              >
                {t(`notices.priorities.${p}`)}
              </button>
            ))}
          </div>
        </FormField>
      </form>
    </Modal>
  );
}