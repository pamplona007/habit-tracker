import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FormField, InputField } from '../../components/FormField';
import { Button } from '../../components/Button';
import styles from './styles.module.css';

export function LoginPage() {
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
      setError(err instanceof Error ? err.message : 'Invalid email or password');
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
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue tracking your habits</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <FormField label="Email">
            <InputField
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </FormField>

          <FormField label="Password">
            <InputField
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </FormField>

          <Button type="submit" fullWidth>
            Sign in
          </Button>
        </form>

        <p className={styles.footer}>
          Don't have an account? <Link to="/register">Sign up</Link>
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
