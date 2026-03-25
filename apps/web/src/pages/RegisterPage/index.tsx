import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FormField, InputField } from '../../components/FormField';
import { Button } from '../../components/Button';
import styles from './styles.module.css';

export function RegisterPage() {
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
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
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
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.subtitle}>Start building better habits today</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <FormField label="Full name">
            <InputField
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              autoComplete="name"
            />
          </FormField>

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
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />
          </FormField>

          <FormField label="Confirm password">
            <InputField
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              autoComplete="new-password"
            />
          </FormField>

          <Button type="submit" fullWidth>
            Create account
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
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