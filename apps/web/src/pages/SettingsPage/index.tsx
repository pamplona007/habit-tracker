import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useHousehold, useCreateInvite, useLeaveHousehold } from '../../hooks';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/Button';
import styles from './styles.module.css';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const { data: household } = useHousehold(householdId);
  const createInvite = useCreateInvite(householdId);
  const leaveHousehold = useLeaveHousehold();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleCreateInvite = async () => {
    const invite = await createInvite.mutateAsync();
    setInviteCode(invite.code);
    setShowInvite(true);
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
    }
  };

  const handleLeave = async () => {
    await leaveHousehold.mutateAsync(householdId);
    await refreshUser();
    setShowLeaveConfirm(false);
  };

  return (
    <div className={styles.page}>
      <PageHeader title={t('settings.title')} />

      <div className={styles.sections}>
        {/* Profile Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('settings.profile')}</h2>
          <div className={styles.card}>
            <div className={styles.profileInfo}>
              <div className={styles.avatar}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className={styles.userName}>{user?.name}</p>
                <p className={styles.userEmail}>{user?.email}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Household Section */}
        {household && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('settings.household')}</h2>
            <div className={styles.card}>
              <div className={styles.householdInfo}>
                <div className={styles.householdIcon}>
                  <span className="material-symbols-outlined">home</span>
                </div>
                <div className={styles.householdDetails}>
                  <p className={styles.householdName}>{household.name}</p>
                  <p className={styles.householdMeta}>
                    {household.members?.length || 0} {t('settings.members')}
                  </p>
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.inviteSection}>
                <h3>{t('settings.inviteMembers')}</h3>
                <p>{t('settings.inviteMembersDesc')}</p>
                {showInvite && inviteCode ? (
                  <div className={styles.inviteCode}>
                    <span className={styles.code}>{inviteCode}</span>
                    <button onClick={handleCopyCode} className={styles.copyBtn}>
                      <span className="material-symbols-outlined">content_copy</span>
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={handleCreateInvite}
                    loading={createInvite.isPending}
                    iconLeft={<span className="material-symbols-outlined">add_link</span>}
                  >
                    {t('settings.generateInviteCode')}
                  </Button>
                )}
              </div>

              <div className={styles.divider} />

              {/* Members List */}
              <div className={styles.membersSection}>
                <h3>{t('settings.members')}</h3>
                <div className={styles.membersList}>
                  {household.members?.map((member) => (
                    <div key={member.userId} className={styles.member}>
                      <div className={styles.memberAvatar}>
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>
                          {member.user.name}
                          {member.userId === user?.id && ` ${t('common.you')}`}
                        </span>
                        <span className={styles.memberRole}>{t(`household.role.${member.role}`)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.divider} />

              <Button
                variant="ghost"
                onClick={() => setShowLeaveConfirm(true)}
                iconLeft={<span className="material-symbols-outlined">logout</span>}
              >
                {t('settings.leaveHousehold')}
              </Button>
            </div>
          </section>
        )}

        {/* Language Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('settings.language')}</h2>
          <div className={styles.card}>
            <div className={styles.optionRow}>
              <div className={styles.optionInfo}>
                <span className="material-symbols-outlined">language</span>
                <div>
                  <p className={styles.optionLabel}>{t('settings.preferredLanguage')}</p>
                  <p className={styles.optionDesc}>{t('settings.chooseLanguage')}</p>
                </div>
              </div>
              <select
                className={styles.select}
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
              >
                <option value="en">{t('settings.languageEn')}</option>
                <option value="pt">{t('settings.languagePt')}</option>
              </select>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('settings.account')}</h2>
          <div className={styles.card}>
            <Button
              variant="ghost"
              onClick={logout}
              iconLeft={<span className="material-symbols-outlined">logout</span>}
            >
              {t('auth.logout')}
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        title={`${t('settings.leaveHousehold')}?`}
        message={t('household.leaveMessage')}
        confirmLabel={t('household.leave')}
        variant="danger"
      />
    </div>
  );
}
