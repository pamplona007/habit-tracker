import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotices, useCreateNotice, useDeleteNotice } from '../../hooks';
import type { NoticePriority } from '../../types';
import styles from './styles.module.css';

const PRIORITIES: NoticePriority[] = ['low', 'normal', 'high', 'urgent'];

export function NoticesPage() {
  const { user } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);

  const { data: notices, isLoading } = useNotices(householdId);
  const deleteNotice = useDeleteNotice();

  const handleDelete = async (noticeId: string) => {
    if (window.confirm('Are you sure you want to delete this notice?')) {
      await deleteNotice.mutateAsync({ householdId, noticeId });
    }
  };

  const activeNotices = notices?.filter((n) => n.isActive) || [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Notices</h1>
          <p className={styles.subtitle}>{activeNotices.length} active notices</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowCreateModal(true)}>
          <span className="material-symbols-outlined">add</span>
          Add notice
        </button>
      </header>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading notices...</p>
        </div>
      ) : activeNotices.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-symbols-outlined">campaign</span>
          <h3>No notices yet</h3>
          <p>Create your first notice to share with your household</p>
          <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            Create notice
          </button>
        </div>
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
                <button className={styles.deleteBtn} onClick={() => handleDelete(notice.id)}>
                  <span className="material-symbols-outlined">delete</span>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateNoticeModal householdId={householdId} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CreateNoticeModal({
  householdId,
  onClose,
}: {
  householdId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<NoticePriority>('normal');
  const createNotice = useCreateNotice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createNotice.mutateAsync({
      householdId,
      notice: { title, content, priority },
    });
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create notice</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Important announcement"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your notice here..."
              rows={4}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Priority</label>
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
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={createNotice.isPending}>
              {createNotice.isPending ? <span className={styles.spinner} /> : 'Create notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
