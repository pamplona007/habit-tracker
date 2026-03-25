import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTasks, useStreak, useNotices, useShoppingLists } from '../../hooks';
import { Link } from 'react-router-dom';
import { QuickStartModal } from '../../components/QuickStartModal';
import { getRandomPendingTask } from '../../utils/tasks';
import type { Task } from '../../types';
import styles from './styles.module.css';

const SHOPPING_ICONS = ['local_grocery_store', 'home_repair_service', 'medical_services', 'inventory_2'];

export function DashboardPage() {
  const { user } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const { data: tasks } = useTasks(householdId);
  const streak = useStreak(tasks);
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

  const pendingTasks = tasks?.filter((t) => !t.userCompleted) || [];
  const todayTasks = pendingTasks.slice(0, 2);

  const handleQuickStart = () => {
    if (tasks) {
      const randomTask = getRandomPendingTask(tasks);
      setQuickStartTask(randomTask);
    }
  };

  const handleRollAgain = (currentTask: Task) => {
    if (tasks) {
      const newPendingTasks = tasks.filter((t) => !t.userCompleted && t.id !== currentTask.id);
      if (newPendingTasks.length > 0) {
        const randomIndex = Math.floor(Math.random() * newPendingTasks.length);
        setQuickStartTask(newPendingTasks[randomIndex]);
      }
    }
  };

  const activeNotices = notices?.filter((n) => n.isActive).slice(0, 3) || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
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
              <span className={styles.streakLabel}>Day Streak</span>
            </div>
          </div>
        </section>

        {/* Focus Today Section */}
        <section className={styles.focusSection}>
          <div className={styles.focusHeader}>
            <div>
              <h2 className={styles.focusTitle}>Focus Today</h2>
              <p className={styles.focusSubtitle}>
                {pendingTasks.length} {pendingTasks.length === 1 ? 'Task' : 'Tasks'} Pending
              </p>
            </div>
            <button className={styles.quickStartBtn} onClick={handleQuickStart}>
              <span className="material-symbols-outlined">bolt</span>
              Quick Start
            </button>
          </div>

          <div className={styles.tasksGrid}>
            {todayTasks.length === 0 ? (
              <div className={styles.emptyState}>
                <span className="material-symbols-outlined">check_circle</span>
                <p>All caught up!</p>
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
                    <span className={styles.priorityBadge}>Daily</span>
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
              <span className={styles.statLabel}>Current Streak</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">emoji_events</span>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{streak.longest}</span>
              <span className={styles.statLabel}>Best Streak</span>
            </div>
          </div>
        </section>

        {/* Announcements Section */}
        <section className={styles.announcementsSection}>
          <h2 className={styles.sectionTitle}>Announcements</h2>
          {activeNotices.length === 0 ? (
            <div className={styles.noticeCard}>
              <div className={styles.noticeIcon}>
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <div className={styles.noticeContent}>
                <p className={styles.noticeEmpty}>No active announcements</p>
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
              <h2 className={styles.sectionTitle}>Shopping Lists</h2>
              <Link to="/shopping" className={styles.viewAllLink}>
                Manage
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
                      {list.incompleteCount} {list.incompleteCount === 1 ? 'Item' : 'Items'}
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
            <span>Add Task</span>
          </Link>
          <Link to="/shopping" className={styles.quickAction}>
            <span className="material-symbols-outlined">shopping_cart</span>
            <span>Shopping</span>
          </Link>
          <Link to="/settings" className={styles.quickAction}>
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
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
