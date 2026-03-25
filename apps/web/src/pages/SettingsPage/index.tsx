import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHousehold, useCreateInvite, useLeaveHousehold } from '../../hooks';
import styles from './styles.module.css';

export function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const householdId = user?.currentHouseholdId || '';
  const { data: household } = useHousehold(householdId);
  const createInvite = useCreateInvite(householdId);
  const leaveHousehold = useLeaveHousehold();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

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
    if (household && window.confirm(`Are you sure you want to leave ${household.name}?`)) {
      await leaveHousehold.mutateAsync(householdId);
      await refreshUser();
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Settings</h1>
      </header>

      <div className={styles.sections}>
        {/* Profile Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
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
            <h2 className={styles.sectionTitle}>Household</h2>
            <div className={styles.card}>
              <div className={styles.householdInfo}>
                <div className={styles.householdIcon}>
                  <span className="material-symbols-outlined">home</span>
                </div>
                <div className={styles.householdDetails}>
                  <p className={styles.householdName}>{household.name}</p>
                  <p className={styles.householdMeta}>
                    {household.members?.length || 0} members
                  </p>
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.inviteSection}>
                <h3>Invite members</h3>
                <p>Generate a code to invite others to your household</p>
                {showInvite && inviteCode ? (
                  <div className={styles.inviteCode}>
                    <span className={styles.code}>{inviteCode}</span>
                    <button onClick={handleCopyCode} className={styles.copyBtn}>
                      <span className="material-symbols-outlined">content_copy</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateInvite}
                    className={styles.generateBtn}
                    disabled={createInvite.isPending}
                  >
                    <span className="material-symbols-outlined">add_link</span>
                    Generate invite code
                  </button>
                )}
              </div>

              <div className={styles.divider} />

              {/* Members List */}
              <div className={styles.membersSection}>
                <h3>Members</h3>
                <div className={styles.membersList}>
                  {household.members?.map((member) => (
                    <div key={member.userId} className={styles.member}>
                      <div className={styles.memberAvatar}>
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>
                          {member.user.name}
                          {member.userId === user?.id && ' (you)'}
                        </span>
                        <span className={styles.memberRole}>{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.divider} />

              <button onClick={handleLeave} className={styles.leaveBtn}>
                <span className="material-symbols-outlined">logout</span>
                Leave household
              </button>
            </div>
          </section>
        )}

        {/* Language Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Language</h2>
          <div className={styles.card}>
            <div className={styles.optionRow}>
              <div className={styles.optionInfo}>
                <span className="material-symbols-outlined">language</span>
                <div>
                  <p className={styles.optionLabel}>Language</p>
                  <p className={styles.optionDesc}>Choose your preferred language</p>
                </div>
              </div>
              <select
                className={styles.select}
                value={localStorage.getItem('language') || 'en'}
                onChange={(e) => {
                  localStorage.setItem('language', e.target.value);
                  window.location.reload();
                }}
              >
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.card}>
            <button onClick={logout} className={styles.logoutBtn}>
              <span className="material-symbols-outlined">logout</span>
              Log out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
