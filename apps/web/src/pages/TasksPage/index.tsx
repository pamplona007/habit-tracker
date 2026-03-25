import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTasks, useStreak, useCreateTask, useCompleteTask, useUncompleteTask, useDeleteTask } from '../../hooks';
import type { Task, TaskType, TaskPriority } from '../../types';
import styles from './styles.module.css';

const TASK_TYPE_KEYS: { value: TaskType | 'ALL'; key: string }[] = [
  { value: 'ALL', key: 'tasks.filters.all' },
  { value: 'DAILY', key: 'tasks.types.DAILY' },
  { value: 'WEEKLY', key: 'tasks.types.WEEKLY' },
  { value: 'MONTHLY', key: 'tasks.types.MONTHLY' },
  { value: 'ONE_TIME', key: 'tasks.types.ONE_TIME' },
];

const TASK_PRIORITY_KEYS: { value: TaskPriority; key: string }[] = [
  { value: 'low', key: 'tasks.priorities.low' },
  { value: 'normal', key: 'tasks.priorities.normal' },
  { value: 'high', key: 'tasks.priorities.high' },
  { value: 'urgent', key: 'tasks.priorities.urgent' },
];

export function TasksPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const [filter, setFilter] = useState<TaskType | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: allTasks } = useTasks(householdId);
  const { data: tasks, isLoading } = useTasks(householdId, filter === 'ALL' ? undefined : filter);
  const streak = useStreak(allTasks);
  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();
  const deleteTask = useDeleteTask();

  const handleToggleComplete = async (task: Task) => {
    if (task.userCompleted) {
      await uncompleteTask.mutateAsync({ householdId, taskId: task.id });
    } else {
      await completeTask.mutateAsync({ householdId, taskId: task.id, type: 'FULL' });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm(t('common.confirmDelete'))) {
      await deleteTask.mutateAsync({ householdId, taskId });
    }
  };

  const pendingTasks = tasks?.filter((t) => !t.userCompleted) || [];
  const completedTasks = tasks?.filter((t) => t.userCompleted) || [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{t('tasks.title')}</h1>
          <p className={styles.subtitle}>
            {pendingTasks.length} {t('tasks.pending')} · {completedTasks.length} {t('tasks.completed')}
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowCreateModal(true)}>
          <span className="material-symbols-outlined">add</span>
          {t('tasks.create')}
        </button>
      </header>

      <div className={styles.streakBar}>
        <div className={styles.streakItem}>
          <span className="material-symbols-outlined">local_fire_department</span>
          <span>{streak.current} {t('tasks.streak')}</span>
        </div>
        <div className={styles.streakItem}>
          <span className="material-symbols-outlined">emoji_events</span>
          <span>{t('tasks.longestStreak')}: {streak.longest}</span>
        </div>
      </div>

      <div className={styles.filters}>
        {TASK_TYPE_KEYS.map((type) => (
          <button
            key={type.value}
            className={`${styles.filterChip} ${filter === type.value ? styles.active : ''}`}
            onClick={() => setFilter(type.value)}
          >
            {t(type.key)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>{t('common.loading')}</p>
        </div>
      ) : tasks?.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-symbols-outlined">task_alt</span>
          <h3>{t('tasks.noTasks')}</h3>
          <p>{t('tasks.createFirst')}</p>
          <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            {t('tasks.create')}
          </button>
        </div>
      ) : (
        <div className={styles.taskSections}>
          {pendingTasks.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('tasks.todo')}</h2>
              <div className={styles.taskList}>
                {pendingTasks.map((task) => (
                  <div key={task.id} className={styles.taskCard}>
                    <button
                      className={styles.checkBtn}
                      onClick={() => handleToggleComplete(task)}
                    >
                      <span className="material-symbols-outlined">radio_button_unchecked</span>
                    </button>
                    <div className={styles.taskContent}>
                      <span className={styles.taskName}>{task.name}</span>
                      {task.description && (
                        <span className={styles.taskDesc}>{task.description}</span>
                      )}
                    </div>
                    <span className={`${styles.taskPriority} ${styles[task.priority]}`}>
                      {t(`tasks.priorities.${task.priority}`)}
                    </span>
                    <span className={styles.taskType}>{t(`tasks.types.${task.type}`)}</span>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(task.id)}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {completedTasks.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('tasks.completed')}</h2>
              <div className={styles.taskList}>
                {completedTasks.map((task) => (
                  <div key={task.id} className={`${styles.taskCard} ${styles.completed}`}>
                    <button
                      className={styles.checkBtn}
                      onClick={() => handleToggleComplete(task)}
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                    </button>
                    <div className={styles.taskContent}>
                      <span className={styles.taskName}>{task.name}</span>
                    </div>
                    <span className={styles.taskType}>{t(`tasks.types.${task.type}`)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateTaskModal
          householdId={householdId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function CreateTaskModal({
  householdId,
  onClose,
}: {
  householdId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('DAILY');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const createTask = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask.mutateAsync({
      householdId,
      task: { name, description: description || undefined, type, priority },
    });
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('tasks.create')}</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label>{t('tasks.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tasks.namePlaceholder')}
              required
            />
          </div>

          <div className={styles.field}>
            <label>{t('tasks.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('tasks.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label>{t('tasks.type')}</label>
            <div className={styles.typeOptions}>
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME'] as TaskType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.typeOption} ${type === t ? styles.active : ''}`}
                  onClick={() => setType(t)}
                >
                  {t === 'ONE_TIME' ? t.replace('_', ' ') : t}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>{t('tasks.priority')}</label>
            <div className={styles.priorityOptions}>
              {TASK_PRIORITY_KEYS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`${styles.priorityOption} ${priority === p.value ? styles.active : ''} ${styles[p.value]}`}
                  onClick={() => setPriority(p.value)}
                >
                  {t(p.key)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={styles.submitBtn} disabled={createTask.isPending}>
              {createTask.isPending ? <span className={styles.spinner} /> : t('tasks.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
