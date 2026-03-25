import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import {
  useHousehold,
  useCreateInvite,
  useLeaveHousehold,
} from '../../hooks';
import {
  useUpdateHousehold,
  useUpdateMemberRole,
  useRemoveMember,
} from '../../hooks/useHouseholds';
import { authApi } from '../../api/auth';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import styles from './styles.module.css';

const AUTH_KEYS = {
  me: ['auth', 'me'] as const,
};

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const householdId = user?.currentHouseholdId || '';
  const { data: household } = useHousehold(householdId);
  const createInvite = useCreateInvite(householdId);
  const leaveHousehold = useLeaveHousehold();
  const updateHousehold = useUpdateHousehold(householdId);
  const updateMemberRole = useUpdateMemberRole(householdId);
  const removeMember = useRemoveMember(householdId);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Household name edit state
  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);
  const [householdName, setHouseholdName] = useState(household?.name || '');

  // Member removal confirmation
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [memberToRemoveName, setMemberToRemoveName] = useState<string | null>(null);

  // Role change state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberRole, setEditingMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');

  // Determine user role in household
  const userMembership = household?.members?.find((m) => m.userId === user?.id);
  const userRole = userMembership?.role;
  const isOwner = userRole === 'OWNER';
  const isAdmin = userRole === 'ADMIN' || isOwner;

  // Profile mutations
  const updateProfileMutation = {
    isPending: false,
    mutateAsync: async (data: { name?: string; email?: string }) => {
      const result = await authApi.updateProfile(data);
      await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
      return result;
    },
  };

  const changePasswordMutation = {
    isPending: false,
    mutateAsync: async (data: { currentPassword: string; newPassword: string }) => {
      return authApi.changePassword(data);
    },
  };

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

  // Profile handlers
  const handleEditProfile = () => {
    setProfileName(user?.name || '');
    setProfileEmail(user?.email || '');
    setProfileError(null);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setProfileError(null);
    try {
      await updateProfileMutation.mutateAsync({ name: profileName, email: profileEmail });
      await refreshUser();
      setIsEditingProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleCancelProfileEdit = () => {
    setIsEditingProfile(false);
    setProfileError(null);
  };

  // Password modal handlers
  const handleOpenPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError(t('auth.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.passwordsDoNotMatch'));
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      setShowPasswordModal(false);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  // Household name handlers
  const handleEditHouseholdName = () => {
    setHouseholdName(household?.name || '');
    setIsEditingHouseholdName(true);
  };

  const handleSaveHouseholdName = async () => {
    if (householdName.trim() && householdName !== household?.name) {
      await updateHousehold.mutateAsync({ name: householdName.trim() });
    }
    setIsEditingHouseholdName(false);
  };

  const handleCancelHouseholdNameEdit = () => {
    setIsEditingHouseholdName(false);
  };

  // Member role handlers
  const handleStartEditRole = (memberId: string, currentRole: 'ADMIN' | 'MEMBER') => {
    setEditingMemberId(memberId);
    setEditingMemberRole(currentRole);
  };

  const handleSaveRole = async (memberId: string) => {
    await updateMemberRole.mutateAsync({ userId: memberId, role: editingMemberRole });
    setEditingMemberId(null);
  };

  const handleCancelRoleEdit = () => {
    setEditingMemberId(null);
  };

  // Member removal handlers
  const handleRemoveMember = (memberId: string, memberName: string) => {
    setMemberToRemove(memberId);
    setMemberToRemoveName(memberName);
  };

  const handleConfirmRemoveMember = async () => {
    if (memberToRemove) {
      await removeMember.mutateAsync(memberToRemove);
    }
    setMemberToRemove(null);
    setMemberToRemoveName(null);
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
              {isEditingProfile ? (
                <div className={styles.profileEditForm}>
                  <div className={styles.formField}>
                    <label className={styles.label}>{t('auth.name')}</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.label}>{t('auth.email')}</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                    />
                  </div>
                  {profileError && <p className={styles.error}>{profileError}</p>}
                  <div className={styles.profileEditActions}>
                    <Button variant="ghost" onClick={handleCancelProfileEdit}>
                      {t('common.cancel')}
                    </Button>
                    <Button variant="primary" onClick={handleSaveProfile}>
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.profileDisplay}>
                  <div className={styles.profileText}>
                    <p className={styles.userName}>{user?.name}</p>
                    <p className={styles.userEmail}>{user?.email}</p>
                  </div>
                  <div className={styles.profileActions}>
                    <Button variant="ghost" size="sm" onClick={handleEditProfile}>
                      {t('common.edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleOpenPasswordModal}>
                      {t('settings.changePassword')}
                    </Button>
                  </div>
                </div>
              )}
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
                  {isEditingHouseholdName ? (
                    <div className={styles.householdNameEdit}>
                      <input
                        type="text"
                        className={styles.input}
                        value={householdName}
                        onChange={(e) => setHouseholdName(e.target.value)}
                      />
                      <div className={styles.inlineActions}>
                        <Button variant="ghost" size="sm" onClick={handleCancelHouseholdNameEdit}>
                          {t('common.cancel')}
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleSaveHouseholdName}>
                          {t('common.save')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={styles.householdName}>
                        {household.name}
                        {isAdmin && (
                          <button
                            className={styles.editIconBtn}
                            onClick={handleEditHouseholdName}
                            aria-label={t('common.edit')}
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                        )}
                      </p>
                      <p className={styles.householdMeta}>
                        {household.members?.length || 0} {t('settings.members')}
                      </p>
                    </>
                  )}
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
                        <span className={styles.memberRole}>
                          {t(`household.role.${member.role}`)}
                        </span>
                      </div>
                      <div className={styles.memberActions}>
                        {isOwner && member.role !== 'OWNER' && (
                          <>
                            {editingMemberId === member.userId ? (
                              <div className={styles.roleEdit}>
                                <select
                                  className={styles.roleSelect}
                                  value={editingMemberRole}
                                  onChange={(e) =>
                                    setEditingMemberRole(e.target.value as 'ADMIN' | 'MEMBER')
                                  }
                                >
                                  <option value="ADMIN">{t('household.role.ADMIN')}</option>
                                  <option value="MEMBER">{t('household.role.MEMBER')}</option>
                                </select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSaveRole(member.userId)}
                                >
                                  {t('common.save')}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleCancelRoleEdit}>
                                  {t('common.cancel')}
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleStartEditRole(member.userId, member.role as 'ADMIN' | 'MEMBER')
                                  }
                                >
                                  <span className="material-symbols-outlined">edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveMember(member.userId, member.user.name)
                                  }
                                >
                                  <span className="material-symbols-outlined">person_remove</span>
                                </Button>
                              </>
                            )}
                          </>
                        )}
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

      {/* Leave Household Confirmation */}
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        title={`${t('settings.leaveHousehold')}?`}
        message={t('household.leaveMessage')}
        confirmLabel={t('household.leave')}
        variant="danger"
      />

      {/* Remove Member Confirmation */}
      <ConfirmDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        title={`${t('settings.removeMember')}?`}
        message={t('settings.removeMemberMessage', { name: memberToRemoveName || '' })}
        confirmLabel={t('settings.remove')}
        variant="danger"
      />

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={t('settings.changePassword')}
        actions={
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleChangePassword}>
              {t('settings.changePassword')}
            </Button>
          </div>
        }
      >
        <div className={styles.passwordForm}>
          <div className={styles.formField}>
            <label className={styles.label}>{t('settings.currentPassword')}</label>
            <input
              type="password"
              className={styles.input}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label}>{t('auth.newPassword')}</label>
            <input
              type="password"
              className={styles.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('auth.passwordMinLength')}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label}>{t('auth.confirmPassword')}</label>
            <input
              type="password"
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPasswordPlaceholder')}
            />
          </div>
          {passwordError && <p className={styles.error}>{passwordError}</p>}
        </div>
      </Modal>
    </div>
  );
}