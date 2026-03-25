import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTasks, useStreak, useNotices, useShoppingLists } from '../../hooks';
import { computeUserTaskFields, getRandomPendingTask } from '../../utils/tasks';
import { Link } from 'react-router-dom';
import { QuickStartModal } from '../../components/QuickStartModal';
import type { Task } from '../../types';
import styles from './styles.module.css';

const SHOPPING_ICONS = ['local_grocery_store', 'home_repair_service', 'medical_services', 'inventory_2'];

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const { data: rawTasks } = useTasks(householdId);
  const streak = useStreak(rawTasks);
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

  const tasks = useMemo(
    () => (user?.id ? computeUserTaskFields(rawTasks || [], user.id) : rawTasks || []),
    [rawTasks, user],
  );
  const pendingTasks = useMemo(() => tasks.filter((t) => !t.userCompleted), [tasks]);
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
    <div className={styles.page}>

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <p className={styles.greetingLabel}>{getGreeting()}</p>
            <h2 className={styles.greetingName}>{user?.name}</h2>
          </div>
          <div className={styles.streakBadge}>
            <span className="material-symbols-outlined">local_fire_department</span>
            <div className={styles.streakInfo}>
              <span className={styles.streakValue}>{streak.current}</span>
              <span className={styles.streakLabel}>{t('dashboard.dayStreak')}</span>
            </div>
          </div>
        </section>

        {/* Focus Today Section */}
        <section className={styles.focusSection}>
          <div className={styles.focusHeader}>
            <div>
              <h2 className={styles.focusTitle}>{t('dashboard.focusToday')}</h2>
              <p className={styles.focusSubtitle}>
                {pendingTasks.length} {pendingTasks.length === 1 ? t('dashboard.task') : t('tasks.title')} {t('dashboard.tasksPending')}
              </p>
            </div>
            <button className={styles.quickStartBtn} onClick={handleQuickStart}>
              <span className="material-symbols-outlined">bolt</span>
              {t('dashboard.quickStart')}
            </button>
          </div>

          <div className={styles.tasksGrid}>
            {todayTasks.length === 0 ? (
              <div className={styles.emptyState}>
                <span className="material-symbols-outlined">check_circle</span>
                <p>{t('dashboard.allCaughtUp')}</p>
              </div>
            ) : (
              todayTasks.map((task) => (
                <div key={task.id} className={styles.taskCard}>
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

        {/* Streak Stats */}
        <section className={styles.statsSection}>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">local_fire_department</span>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{streak.current}</span>
              <span className={styles.statLabel}>{t('tasks.streak')}</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">emoji_events</span>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{streak.longest}</span>
              <span className={styles.statLabel}>{t('dashboard.bestStreak')}</span>
            </div>
          </div>
        </section>

        {/* Announcements Section */}
        <section className={styles.announcementsSection}>
          <h2 className={styles.sectionTitle}>{t('dashboard.announcements')}</h2>
          {activeNotices.length === 0 ? (
            <div className={styles.noticeCard}>
              <div className={styles.noticeIcon}>
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <div className={styles.noticeContent}>
                <p className={styles.noticeEmpty}>{t('dashboard.noAnnouncements')}</p>
              </div>
            </div>
          ) : (
            activeNotices.map((notice) => (
              <div key={notice.id} className={`${styles.noticeCard} ${styles[notice.priority]}`}>
                <div className={styles.noticeContent}>
                  <span className={styles.noticeTitle}>{notice.title}</span>
                  <span className={styles.noticeText}>{notice.content}</span>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Shopping Lists Section */}
        {sortedShoppingLists.length > 0 && (
          <section className={styles.shoppingSection}>
            <div className={styles.shoppingHeader}>
              <h2 className={styles.sectionTitle}>{t('dashboard.shoppingLists')}</h2>
              <Link to="/shopping" className={styles.viewAllLink}>
                {t('dashboard.manage')}
                <span className="material-symbols-outlined">chevron_right</span>
              </Link>
            </div>
            <div className={styles.shoppingLists}>
              {sortedShoppingLists.map((list, index) => (
                <Link key={list.id} to="/shopping" className={styles.shoppingCard}>
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

        {/* Quick Actions */}
        <section className={styles.quickActions}>
          <Link to="/tasks" className={styles.quickAction}>
            <span className="material-symbols-outlined">add_task</span>
            <span>{t('tasks.create')}</span>
          </Link>
          <Link to="/shopping" className={styles.quickAction}>
            <span className="material-symbols-outlined">shopping_cart</span>
            <span>{t('nav.shopping')}</span>
          </Link>
          <Link to="/settings" className={styles.quickAction}>
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
