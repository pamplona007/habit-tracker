import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStats } from '../../hooks';
import styles from './styles.module.css';

function formatStatValue(value: number): string {
  if (value >= 1000) return `${Math.floor(value / 1000)}K+`;
  return String(value);
}

const FEATURES = [
  {
    icon: 'group',
    en: { title: 'Household Sync', description: 'Share tasks and responsibilities with your family members in real-time. No more forgotten chores or overlapped efforts.' },
    pt: { title: 'Sincronização Familiar', description: 'Compartilhe tarefas e responsabilidades com sua família em tempo real. Chega de tarefas esquecidas.' },
  },
  {
    icon: 'local_fire_department',
    en: { title: 'Streak Tracking', description: 'Build lasting habits with visual streak tracking. Watch your progress grow day by day and stay motivated.' },
    pt: { title: 'Acompanhamento de Sequências', description: 'Construa hábitos duradouros com acompanhamento visual de sequências. Veja seu progresso crescer.' },
  },
  {
    icon: 'notifications_active',
    en: { title: 'Smart Reminders', description: 'Get notified about upcoming tasks, deadlines, and household announcements. Never miss what matters.' },
    pt: { title: 'Lembretes Inteligentes', description: 'Receba notificações sobre tarefas, prazos e anúncios domésticos. Não perca o que é importante.' },
  },
  {
    icon: 'shopping_cart',
    en: { title: 'Shopping Lists', description: 'Create and share shopping lists with your household. Keep everyone on the same page at the grocery store.' },
    pt: { title: 'Listas de Compras', description: 'Crie e compartilhe listas de compras com sua casa. Mantenha todos alinhados no supermercado.' },
  },
  {
    icon: 'campaign',
    en: { title: 'Household Announcements', description: 'Post important notices and announcements for your household. Keep everyone informed and aligned.' },
    pt: { title: 'Avisos Domésticos', description: 'Publique avisos importantes para sua família. Mantenha todos informados e alinhados.' },
  },
  {
    icon: 'task_alt',
    en: { title: 'Flexible Task Types', description: 'Daily, weekly, monthly, or one-time tasks. Set it up once and let the app handle the reminders.' },
    pt: { title: 'Tipos Flexíveis de Tarefas', description: 'Diárias, semanais, mensais ou únicas. Configure uma vez e deixe o app cuidar dos lembretes.' },
  },
];


export function LandingPage() {
  const { t, i18n } = useTranslation();
  const { data: stats } = useStats();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!pageRef.current) return;
      const elements = pageRef.current.querySelectorAll('[data-animate]');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.85;
        if (isVisible) {
          el.classList.add(styles.visible);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'pt' : 'en');
    localStorage.setItem('language', i18n.language === 'en' ? 'pt' : 'en');
  };

  return (
    <div className={styles.page} ref={pageRef}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <span className="material-symbols-outlined">home</span>
            <span>{t('common.appName')}</span>
          </div>
          <div className={styles.navActions}>
            <button className={styles.langSwitch} onClick={toggleLanguage}>
              <span className="material-symbols-outlined">translate</span>
              {i18n.language === 'en' ? 'PT' : 'EN'}
            </button>
            <Link to="/login" className={styles.navLink}>
              {t('auth.signIn')}
            </Link>
            <Link to="/register" className={styles.navBtn}>
              {t('auth.signUp')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
          <div className={styles.gridPattern} />
        </div>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <div className={styles.badge} data-animate>
              <span className="material-symbols-outlined">auto_awesome</span>
              <span>{t('landing.badge')}</span>
            </div>
            <h1 className={styles.title} data-animate>
              {t('landing.title.line1')}
              <br />
              <span className={styles.highlight}>{t('landing.title.line2')}</span>
            </h1>
            <p className={styles.subtitle} data-animate>
              {t('landing.subtitle')}
            </p>
            <div className={styles.ctas} data-animate>
              <Link to="/register" className={styles.primaryBtn}>
                {t('landing.cta.getStarted')}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link to="/login" className={styles.secondaryBtn}>
                {t('landing.cta.signIn')}
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.mockCard} data-animate>
              <div className={styles.mockHeader}>
                <span className={styles.mockTitle}>{t('landing.mockCard.title')}</span>
                <span className={styles.mockStreak}>
                  <span className="material-symbols-outlined">local_fire_department</span>
                  7 {t('landing.mockCard.streak')}
                </span>
              </div>
              <div className={styles.mockTasks}>
                <div className={styles.mockTask}>
                  <span className="material-symbols-outlined check">check_circle</span>
                  <span>{t('landing.mockCard.task1')}</span>
                </div>
                <div className={styles.mockTask}>
                  <span className="material-symbols-outlined check">check_circle</span>
                  <span>{t('landing.mockCard.task2')}</span>
                </div>
                <div className={`${styles.mockTask} ${styles.pending}`}>
                  <span className="material-symbols-outlined">radio_button_unchecked</span>
                  <span>{t('landing.mockCard.task3')}</span>
                </div>
              </div>
              <div className={styles.mockFooter}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '66%' }} />
                </div>
                <span className={styles.progressText}>66% {t('landing.mockCard.complete')}</span>
              </div>
            </div>
            <div className={styles.floatingBadge1} data-animate>
              <span className="material-symbols-outlined">check_circle</span>
              <span>{t('landing.mockCard.badge1')}</span>
            </div>
            <div className={styles.floatingBadge2} data-animate>
              <span className="material-symbols-outlined">groups</span>
              <span>{t('landing.mockCard.badge2')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats} data-animate>
        <div className={styles.statItem}>
          <span className={`material-symbols-outlined ${styles.statIcon}`}>groups</span>
          <span className={styles.statValue}>{formatStatValue(stats?.households ?? 0)}</span>
          <span className={styles.statLabel}>{t('landing.stats.families')}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`material-symbols-outlined ${styles.statIcon}`}>task_alt</span>
          <span className={styles.statValue}>{formatStatValue(stats?.tasksCompleted ?? 0)}</span>
          <span className={styles.statLabel}>{t('landing.stats.tasksCompleted')}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`material-symbols-outlined ${styles.statIcon}`}>local_fire_department</span>
          <span className={styles.statValue}>{stats?.bestStreak ?? 0}</span>
          <span className={styles.statLabel}>{t('landing.stats.dayStreakRecord')}</span>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.sectionHeader} data-animate>
          <span className={styles.sectionLabel}>{t('landing.features.label')}</span>
          <h2 className={styles.sectionTitle}>{t('landing.features.title')}</h2>
          <p className={styles.sectionSubtitle}>{t('landing.features.subtitle')}</p>
        </div>
        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, index) => (
            <div
              className={styles.featureCard}
              key={index}
              data-animate
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className={styles.featureIcon}>
                <span className="material-symbols-outlined">{feature.icon}</span>
              </div>
              <h3 className={styles.featureTitle}>
                {feature[i18n.language as 'en' | 'pt'].title}
              </h3>
              <p className={styles.featureDesc}>
                {feature[i18n.language as 'en' | 'pt'].description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionHeader} data-animate>
          <span className={styles.sectionLabel}>{t('landing.howItWorks.label')}</span>
          <h2 className={styles.sectionTitle}>{t('landing.howItWorks.title')}</h2>
        </div>
        <div className={styles.steps}>
          <div className={styles.step} data-animate>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <span className="material-symbols-outlined">person_add</span>
              <h3>{t('landing.howItWorks.step1.title')}</h3>
              <p>{t('landing.howItWorks.step1.desc')}</p>
            </div>
          </div>
          <div className={styles.stepConnector} data-animate />
          <div className={styles.step} data-animate>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <span className="material-symbols-outlined">home</span>
              <h3>{t('landing.howItWorks.step2.title')}</h3>
              <p>{t('landing.howItWorks.step2.desc')}</p>
            </div>
          </div>
          <div className={styles.stepConnector} data-animate />
          <div className={styles.step} data-animate>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <span className="material-symbols-outlined">task_alt</span>
              <h3>{t('landing.howItWorks.step3.title')}</h3>
              <p>{t('landing.howItWorks.step3.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection} data-animate>
        <div className={styles.ctaCard}>
          <div className={styles.ctaGlow} />
          <h2>{t('landing.ctaSection.title')}</h2>
          <p>{t('landing.ctaSection.subtitle')}</p>
          <Link to="/register" className={styles.ctaBtn}>
            {t('landing.cta.getStarted')}
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className="material-symbols-outlined">home</span>
            <span>{t('common.appName')}</span>
          </div>
          <p className={styles.footerTagline}>{t('landing.footer.tagline')}</p>
          <p className={styles.footerCopy}>{t('landing.footer.copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
