import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { FormField, InputField } from '../../components/FormField';
import { Button } from '../../components/Button';
import styles from './styles.module.scss';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.failedToCreateAccount'));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link to="/" className={styles.logo}>
            <span className="material-symbols-outlined">home</span>
            <span>{t('common.appName')}</span>
          </Link>
          <h1 className={styles.title}>{t('auth.register')}</h1>
          <p className={styles.subtitle}>{t('auth.registerSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <FormField label={t('auth.name')}>
            <InputField
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.namePlaceholder')}
              required
              autoComplete="name"
            />
          </FormField>

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
              placeholder={t('auth.passwordMinLength')}
              required
              autoComplete="new-password"
            />
          </FormField>

          <FormField label={t('auth.confirmPassword')}>
            <InputField
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              required
              autoComplete="new-password"
            />
          </FormField>

          <Button type="submit" fullWidth>
            {t('auth.register')}
          </Button>
        </form>

        <p className={styles.footer}>
          {t('auth.hasAccount')} <Link to="/login">{t('auth.signIn')}</Link>
        </p>
      </div>

      <div className={styles.visual}>
        <div className={styles.visualContent}>
          <div className={styles.mockCard}>
            <div className={styles.mockTitle}>Your habit journey starts here</div>
            <div className={styles.mockItems}>
              <div className={styles.mockItem}>
                <span className="material-symbols-outlined">check_circle</span>
                <span>Track daily tasks with ease</span>
              </div>
              <div className={styles.mockItem}>
                <span className="material-symbols-outlined">check_circle</span>
                <span>Build streaks and stay motivated</span>
              </div>
              <div className={styles.mockItem}>
                <span className="material-symbols-outlined">check_circle</span>
                <span>Share responsibilities with family</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}