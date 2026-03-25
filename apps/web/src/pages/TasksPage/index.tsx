import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTasks, useStreak, useCreateTask, useCompleteTask, useUncompleteTask, useDeleteTask } from '../../hooks';
import { computeUserTaskFields } from '../../utils/tasks';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField, InputField, TextareaField } from '../../components/FormField';
import { Button } from '../../components/Button';
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
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const { data: allTasks, isLoading: isLoadingAll } = useTasks(householdId);
  const { data: filteredTasks, isLoading: isLoadingFiltered } = useTasks(householdId, filter === 'ALL' ? undefined : filter);
  const isLoading = isLoadingAll || isLoadingFiltered;
  const streak = useStreak(allTasks);
  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();
  const deleteTask = useDeleteTask();

  const tasks = user?.id ? computeUserTaskFields(filteredTasks || [], user.id) : filteredTasks || [];

  const handleToggleComplete = async (task: Task) => {
    if (task.userCompleted) {
      await uncompleteTask.mutateAsync({ householdId, taskId: task.id });
    } else {
      await completeTask.mutateAsync({ householdId, taskId: task.id, type: 'FULL' });
    }
  };

  const handleDelete = async () => {
    if (deleteTaskId) {
      await deleteTask.mutateAsync({ householdId, taskId: deleteTaskId });
      setDeleteTaskId(null);
    }
  };

  const pendingTasks = tasks.filter((t) => !t.userCompleted);
  const completedTasks = tasks.filter((t) => t.userCompleted);

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('tasks.title')}
        subtitle={`${pendingTasks.length} ${t('tasks.pending')} · ${completedTasks.length} ${t('tasks.completed')}`}
        action={{
          label: t('tasks.create'),
          icon: <span className="material-symbols-outlined">add</span>,
          onClick: () => setShowCreateModal(true),
        }}
      />

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
        <LoadingState message={t('common.loading')} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="task_alt"
          title={t('tasks.noTasks')}
          description={t('tasks.createFirst')}
          action={{
            label: t('tasks.create'),
            onClick: () => setShowCreateModal(true),
          }}
        />
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
                      onClick={() => setDeleteTaskId(task.id)}
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

      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        householdId={householdId}
      />

      <ConfirmDialog
        isOpen={deleteTaskId !== null}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.actionCannotBeUndone')}
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </div>
  );
}

function CreateTaskModal({
  isOpen,
  onClose,
  householdId,
}: {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('DAILY');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const createTask = useCreateTask();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    await createTask.mutateAsync({
      householdId,
      task: { name, description: description || undefined, type, priority },
    });
    setName('');
    setDescription('');
    setType('DAILY');
    setPriority('normal');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('tasks.create')}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="create-task-form" loading={createTask.isPending}>
            {t('tasks.create')}
          </Button>
        </>
      }
    >
      <form id="create-task-form" onSubmit={handleSubmit}>
        <FormField label={t('tasks.name')}>
          <InputField
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('tasks.namePlaceholder')}
            required
          />
        </FormField>

        <FormField label={t('tasks.description')}>
          <TextareaField
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('tasks.descriptionPlaceholder')}
            rows={3}
          />
        </FormField>

        <FormField label={t('tasks.type')}>
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
        </FormField>

        <FormField label={t('tasks.priority')}>
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
        </FormField>
      </form>
    </Modal>
  );
}