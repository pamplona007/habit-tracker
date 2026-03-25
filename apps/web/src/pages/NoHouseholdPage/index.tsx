import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useHouseholds, useCreateHousehold, useJoinHousehold, useSwitchHousehold } from '../../hooks';
import { Button } from '../../components/Button';
import styles from './styles.module.css';

export function NoHouseholdPage() {
  const { t } = useTranslation();
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

  const handleCreate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createHousehold.mutateAsync(householdName);
      await refreshUser();
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('household.failedToCreate'));
    }
  };

  const handleJoin = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError('');
    try {
      await joinHousehold.mutateAsync(joinCode);
      await refreshUser();
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('household.invalidCode'));
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
          <h1 className={styles.title}>{t('household.noHousehold')}</h1>
          <p className={styles.subtitle}>
            {!hasHouseholds
              ? t('household.createFirst')
              : t('household.createFirst')}
          </p>
        </div>

        {mode === 'choose' && (
          <>
            {hasHouseholds && (
              <div className={styles.householdsList}>
                <h3>{t('household.yourHouseholds')}</h3>
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
                        {household.memberCount} {t('common.members')}
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
                  <h3>{t('household.createHousehold')}</h3>
                  <p>{t('household.createDescription')}</p>
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
                  <h3>{t('household.join')}</h3>
                  <p>{t('household.joinDescription')}</p>
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
              {t('common.back')}
            </button>

            <h2>{t('household.createYourHousehold')}</h2>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label htmlFor="householdName">{t('household.name')}</label>
              <input
                id="householdName"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder={t('household.householdNamePlaceholder')}
                required
              />
            </div>

            <Button type="submit" fullWidth loading={createHousehold.isPending}>
              {t('household.create')}
            </Button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className={styles.form}>
            <button type="button" onClick={() => setMode('choose')} className={styles.backBtn}>
              <span className="material-symbols-outlined">arrow_back</span>
              {t('common.back')}
            </button>

            <h2>{t('household.join')}</h2>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label htmlFor="joinCode">{t('household.inviteCode')}</label>
              <input
                id="joinCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder={t('household.inviteCodePlaceholder')}
                required
              />
            </div>

            <Button type="submit" fullWidth loading={joinHousehold.isPending}>
              {t('household.join')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}