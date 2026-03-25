import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHouseholds, useCreateHousehold, useJoinHousehold, useSwitchHousehold } from '../../hooks';
import styles from './styles.module.css';

export function NoHouseholdPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { data: households } = useHouseholds();
  const createHousehold = useCreateHousehold();
  const joinHousehold = useJoinHousehold();
  const switchHousehold = useSwitchHousehold();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const handleSelectHousehold = async (householdId: string) => {
    await switchHousehold.mutateAsync(householdId);
    await refreshUser();
    navigate('/dashboard');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createHousehold.mutateAsync(householdName);
      await refreshUser();
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create household');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await joinHousehold.mutateAsync(joinCode);
      await refreshUser();
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
    }
  };

  const hasHouseholds = households && households.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h1 className={styles.title}>Welcome, {user?.name}!</h1>
          <p className={styles.subtitle}>
            {!hasHouseholds
              ? "You're not part of any household yet. Create one or join an existing one."
              : 'Select a household or create a new one.'}
          </p>
        </div>

        {mode === 'choose' && (
          <>
            {hasHouseholds && (
              <div className={styles.householdsList}>
                <h3>Your households</h3>
                {households.map((household) => (
                  <button
                    key={household.id}
                    className={`${styles.householdCard} ${
                      household.id === user?.currentHouseholdId ? styles.current : ''
                    }`}
                    onClick={() => handleSelectHousehold(household.id)}
                    disabled={switchHousehold.isPending}
                  >
                    <div className={styles.householdIcon}>
                      <span className="material-symbols-outlined">home</span>
                    </div>
                    <div className={styles.householdInfo}>
                      <span className={styles.householdName}>{household.name}</span>
                      <span className={styles.householdMeta}>
                        {household.memberCount} members
                      </span>
                    </div>
                    {household.id === user?.currentHouseholdId && (
                      <span className={styles.currentBadge}>Current</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.options}>
              <button
                className={styles.optionCard}
                onClick={() => setMode('create')}
              >
                <div className={styles.optionIcon}>
                  <span className="material-symbols-outlined">add_home</span>
                </div>
                <div className={styles.optionContent}>
                  <h3>Create a household</h3>
                  <p>Start a new household and invite your family</p>
                </div>
                <span className="material-symbols-outlined arrow">arrow_forward</span>
              </button>

              <button
                className={styles.optionCard}
                onClick={() => setMode('join')}
              >
                <div className={styles.optionIcon}>
                  <span className="material-symbols-outlined">group_add</span>
                </div>
                <div className={styles.optionContent}>
                  <h3>Join a household</h3>
                  <p>Enter a code to join an existing household</p>
                </div>
                <span className="material-symbols-outlined arrow">arrow_forward</span>
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className={styles.form}>
            <button type="button" onClick={() => setMode('choose')} className={styles.backBtn}>
              <span className="material-symbols-outlined">arrow_back</span>
              Back
            </button>

            <h2>Create your household</h2>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label htmlFor="householdName">Household name</label>
              <input
                id="householdName"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="The Silva Family"
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={createHousehold.isPending}
            >
              {createHousehold.isPending ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  Create household
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className={styles.form}>
            <button type="button" onClick={() => setMode('choose')} className={styles.backBtn}>
              <span className="material-symbols-outlined">arrow_back</span>
              Back
            </button>

            <h2>Join a household</h2>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label htmlFor="joinCode">Invite code</label>
              <input
                id="joinCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter the invite code"
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={joinHousehold.isPending}
            >
              {joinHousehold.isPending ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  Join household
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
