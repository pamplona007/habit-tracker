import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { FormField, InputField } from '../../components/FormField';
import { Button } from '../../components/Button';
import styles from './styles.module.css';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.invalidCredentials'));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link to="/" className={styles.logo}>
            <span className="material-symbols-outlined">home_tracker</span>
            <span>Habit</span>
          </Link>
          <h1 className={styles.title}>{t('auth.login')}</h1>
          <p className={styles.subtitle}>{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <FormField label={t('auth.email')}>
            <InputField
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              autoComplete="email"
            />
          </FormField>

          <FormField label={t('auth.password')}>
            <InputField
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              autoComplete="current-password"
            />
          </FormField>

          <Button type="submit" fullWidth>
            {t('auth.signIn')}
          </Button>
        </form>

        <p className={styles.footer}>
          {t('auth.noAccount')} <Link to="/register">{t('auth.signUp')}</Link>
        </p>
      </div>

      <div className={styles.visual}>
        <div className={styles.visualContent}>
          <div className={styles.mockCard}>
            <div className={styles.mockHeader}>
              <div className={styles.mockAvatar}>M</div>
              <div>
                <div className={styles.mockName}>Maria Silva</div>
                <div className={styles.mockRole}>Building habits since 2024</div>
              </div>
            </div>
            <div className={styles.mockStats}>
              <div className={styles.mockStat}>
                <span className={styles.mockStatValue}>23</span>
                <span className={styles.mockStatLabel}>Day Streak</span>
              </div>
              <div className={styles.mockStat}>
                <span className={styles.mockStatValue}>156</span>
                <span className={styles.mockStatLabel}>Tasks Done</span>
              </div>
              <div className={styles.mockStat}>
                <span className={styles.mockStatValue}>4</span>
                <span className={styles.mockStatLabel}>Active Tasks</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
