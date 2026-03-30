import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTasks, useStreak, useNotices, useShoppingLists } from '../../hooks';
import { getRandomPendingTask } from '../../utils/tasks';
import { Link } from 'react-router-dom';
import { QuickStartModal } from '../../components/QuickStartModal';
import type { Task } from '../../types';
import styles from './styles.module.css';

const SHOPPING_ICONS = ['local_grocery_store', 'home_repair_service', 'medical_services', 'inventory_2'];

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const { data: rawTasks = [] } = useTasks(householdId);
  const { data: streak = { current: 0, longest: 0, lastCompletedDate: null } } = useStreak(householdId);
  const { data: notices } = useNotices(householdId);
  const { data: shoppingLists } = useShoppingLists(householdId);

  const [quickStartTask, setQuickStartTask] = useState<Task | null>(null);

  const sortedShoppingLists = shoppingLists
    ?.map((list) => ({
      ...list,
      incompleteCount: list.items.filter((item) => !item.isChecked).length,
    }))
    .sort((a, b) => b.incompleteCount - a.incompleteCount)
    .slice(0, 4) || [];


  const pendingTasks = useMemo(() => rawTasks.filter((t) => !t.completed), [rawTasks]);
  const todayTasks = pendingTasks.slice(0, 2);

  const handleQuickStart = useCallback(() => {
    const randomTask = getRandomPendingTask(pendingTasks);
    setQuickStartTask(randomTask);
  }, [pendingTasks]);

  const handleRollAgain = useCallback(
    (currentTask: Task) => {
      const newPendingTasks = pendingTasks.filter((t) => t.id !== currentTask.id);
      if (newPendingTasks.length > 0) {
        const randomIndex = Math.floor(Math.random() * newPendingTasks.length);
        setQuickStartTask(newPendingTasks[randomIndex]);
      }
    },
    [pendingTasks],
  );

  const activeNotices = notices?.filter((n) => n.isActive).slice(0, 3) || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greetingMorning');
    if (hour < 18) return t('dashboard.greetingAfternoon');
    return t('dashboard.greetingEvening');
  };

  return (
    <div className={styles.page} data-testid="dashboard-page">

      <main className={styles.main}>
        <section className={styles.heroSection} data-testid="hero-section">
          <div className={styles.heroContent}>
            <p className={styles.greetingLabel} data-testid="greeting-label">{getGreeting()}</p>
            <h2 className={styles.greetingName} data-testid="greeting-name">{user?.name}</h2>
          </div>
          <div className={styles.streakBadge} data-testid="streak-badge">
            <span className="material-symbols-outlined">local_fire_department</span>
            <span className={styles.streakValue} data-testid="streak-current">{streak.current}</span>
            <span className={styles.streakLabel}>{t('dashboard.dayStreak')}</span>
          </div>
        </section>

        <section className={styles.focusSection} data-testid="focus-section">
          <div className={styles.focusHeader}>
            <div>
              <h2 className={styles.focusTitle} data-testid="focus-title">{t('dashboard.focusToday')}</h2>
              <p className={styles.focusSubtitle} data-testid="pending-tasks-count">
                {pendingTasks.length} {pendingTasks.length === 1 ? t('dashboard.task') : t('tasks.title')} {t('dashboard.tasksPending')}
              </p>
            </div>
            <button className={styles.quickStartBtn} onClick={handleQuickStart} data-testid="quick-start-btn">
              <span className="material-symbols-outlined">bolt</span>
              {t('dashboard.quickStart')}
            </button>
          </div>

          <div className={styles.tasksGrid}>
            {todayTasks.length === 0 ? (
              <div className={styles.emptyState} data-testid="empty-state">
                <span className="material-symbols-outlined">check_circle</span>
                <p data-testid="all-caught-up-text">{t('dashboard.allCaughtUp')}</p>
              </div>
            ) : (
              todayTasks.map((task) => (
                <div key={task.id} className={styles.taskCard} data-testid={`task-card-${task.id}`}>
                  <div className={styles.taskCardContent}>
                    <div className={styles.taskInfo}>
                      <h3 className={styles.taskName}>{task.name}</h3>
                      {task.description && (
                        <p className={styles.taskDesc}>{task.description}</p>
                      )}
                    </div>
                    <div className={styles.taskIconWrapper}>
                      <span className="material-symbols-outlined">task_alt</span>
                    </div>
                  </div>
                  <div className={styles.taskMeta}>
                    <span className={styles.priorityBadge}>{t(`tasks.types.${task.type}`)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={styles.statsSection} data-testid="stats-section">
          <div className={styles.statCard} data-testid="streak-stat-card">
            <span className="material-symbols-outlined">local_fire_department</span>
            <div className={styles.statContent}>
              <span className={styles.statValue} data-testid="streak-value">{streak.current}</span>
              <span className={styles.statLabel}>{t('tasks.streak')}</span>
            </div>
          </div>
          <div className={styles.statCard} data-testid="best-streak-stat-card">
            <span className="material-symbols-outlined">emoji_events</span>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{streak.longest}</span>
              <span className={styles.statLabel}>{t('dashboard.bestStreak')}</span>
            </div>
          </div>
        </section>

        <section className={styles.announcementsSection} data-testid="announcements-section">
          <h2 className={styles.sectionTitle} data-testid="announcements-title">{t('dashboard.announcements')}</h2>
          {activeNotices.length === 0 ? (
            <div className={styles.noticeCard} data-testid="no-notices-card">
              <div className={styles.noticeIcon}>
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <div className={styles.noticeContent}>
                <p className={styles.noticeEmpty} data-testid="no-notices-text">{t('dashboard.noAnnouncements')}</p>
              </div>
            </div>
          ) : (
            activeNotices.map((notice) => (
              <div key={notice.id} className={`${styles.noticeCard} ${styles[notice.priority]}`} data-testid={`notice-card-${notice.id}`}>
                <div className={styles.noticeContent}>
                  <span className={styles.noticeTitle}>{notice.title}</span>
                  <span className={styles.noticeText}>{notice.content}</span>
                </div>
              </div>
            ))
          )}
        </section>

        {sortedShoppingLists.length > 0 && (
          <section className={styles.shoppingSection} data-testid="shopping-section">
            <div className={styles.shoppingHeader}>
              <h2 className={styles.sectionTitle} data-testid="shopping-title">{t('dashboard.shoppingLists')}</h2>
              <Link to="/shopping" className={styles.viewAllLink} data-testid="manage-shopping-link">
                {t('dashboard.manage')}
                <span className="material-symbols-outlined">chevron_right</span>
              </Link>
            </div>
            <div className={styles.shoppingLists}>
              {sortedShoppingLists.map((list, index) => (
                <Link key={list.id} to="/shopping" className={styles.shoppingCard} data-testid={`shopping-card-${list.id}`}>
                  <div className={styles.shoppingIcon}>
                    <span className="material-symbols-outlined">
                      {SHOPPING_ICONS[index % SHOPPING_ICONS.length]}
                    </span>
                  </div>
                  <div className={styles.shoppingInfo}>
                    <span className={styles.shoppingName}>{list.name}</span>
                    <span className={styles.shoppingCount}>
                      {list.incompleteCount} {list.incompleteCount === 1 ? t('dashboard.task') : t('dashboard.items')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className={styles.quickActions} data-testid="quick-actions">
          <Link to="/tasks" className={styles.quickAction} data-testid="quick-action-tasks">
            <span className="material-symbols-outlined">add_task</span>
            <span>{t('tasks.create')}</span>
          </Link>
          <Link to="/shopping" className={styles.quickAction} data-testid="quick-action-shopping">
            <span className="material-symbols-outlined">shopping_cart</span>
            <span>{t('nav.shopping')}</span>
          </Link>
          <Link to="/settings" className={styles.quickAction} data-testid="quick-action-settings">
            <span className="material-symbols-outlined">settings</span>
            <span>{t('nav.settings')}</span>
          </Link>
        </section>
      </main>

      {quickStartTask && (
        <QuickStartModal
          task={quickStartTask}
          onClose={() => setQuickStartTask(null)}
          onRollAgain={handleRollAgain}
        />
      )}
    </div>
  );
}
