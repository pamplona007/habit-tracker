import { Link } from 'react-router-dom';
import styles from './styles.module.css';

export function LandingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className="material-symbols-outlined">auto_awesome</span>
            <span>Collaborative habit tracking</span>
          </div>
          <h1 className={styles.title}>
            Build better habits,
            <br />
            <span className={styles.highlight}>together.</span>
          </h1>
          <p className={styles.subtitle}>
            Track daily tasks, streaks, and household chores with your family.
            Stay organized and motivated with real-time sync.
          </p>
          <div className={styles.ctas}>
            <Link to="/register" className={styles.primaryBtn}>
              Get started
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link to="/login" className={styles.secondaryBtn}>
              Sign in
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.mockCard}>
            <div className={styles.mockHeader}>
              <span className={styles.mockTitle}>Today's Tasks</span>
              <span className={styles.mockStreak}>7 day streak</span>
            </div>
            <div className={styles.mockTasks}>
              <div className={styles.mockTask}>
                <span className="material-symbols-outlined check">check_circle</span>
                <span>Morning exercise</span>
              </div>
              <div className={styles.mockTask}>
                <span className="material-symbols-outlined check">check_circle</span>
                <span>Read 30 minutes</span>
              </div>
              <div className={styles.mockTask}>
                <span className="material-symbols-outlined">radio_button_unchecked</span>
                <span>Clean kitchen</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <span className="material-symbols-outlined">group</span>
          </div>
          <h3>Household Sync</h3>
          <p>Share tasks and responsibilities with your family members in real-time.</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <span className="material-symbols-outlined">local_fire_department</span>
          </div>
          <h3>Streak Tracking</h3>
          <p>Build lasting habits with visual streak tracking and motivational reminders.</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <span className="material-symbols-outlined">notifications_active</span>
          </div>
          <h3>Smart Reminders</h3>
          <p>Get notified about upcoming tasks, deadlines, and household announcements.</p>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>Built with care for families everywhere</p>
      </footer>
    </div>
  );
}
