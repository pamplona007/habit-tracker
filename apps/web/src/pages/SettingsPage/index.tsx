import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import {
  useHousehold,
  useCreateInvite,
  useLeaveHousehold,
  useUpdateHousehold,
  useUpdateMemberRole,
  useRemoveMember,
  usePushSubscription,
  useNotificationSettings,
} from '../../hooks';
import { authApi } from '../../api/auth';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import styles from './styles.module.scss';

const AUTH_KEYS = {
  me: ['auth', 'me'] as const,
};

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const householdId = user?.currentHouseholdId || '';
  const { data: household } = useHousehold(householdId);
  const createInvite = useCreateInvite(householdId);
  const leaveHousehold = useLeaveHousehold();
  const updateHousehold = useUpdateHousehold(householdId);
  const updateMemberRole = useUpdateMemberRole(householdId);
  const removeMember = useRemoveMember(householdId);

  const { subscription, isSupported, permissionState, subscribe } = usePushSubscription();
  const { settings, updateSettings, isUpdating } = useNotificationSettings();

  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isLinkingGithub, setIsLinkingGithub] = useState(false);
  const [oauthLinkedProvider, setOauthLinkedProvider] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const linked = searchParams.get('oauth_linked');
    const error = searchParams.get('oauth_error');
    if (linked) {
      setOauthLinkedProvider(linked);
      refreshUser();
    }
    if (error) {
      setOauthError(t('auth.oauthError') || error);
    }
  }, [searchParams, t, refreshUser]);

  const handleLinkAccount = async (provider: 'google' | 'github') => {
    if (provider === 'google') setIsLinkingGoogle(true);
    else setIsLinkingGithub(true);
    setOauthError(null);
    try {
      const { redirectUrl } = await authApi.linkAccount(provider);
      window.location.href = redirectUrl;
    } catch {
      setOauthError(t('common.error'));
      setIsLinkingGoogle(false);
      setIsLinkingGithub(false);
    }
  };

  const hasGoogle = user?.accounts?.some((a) => a.provider === 'google');
  const hasGithub = user?.accounts?.some((a) => a.provider === 'github');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileError, setProfileError] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);
  const [householdName, setHouseholdName] = useState(household?.name || '');

  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [memberToRemoveName, setMemberToRemoveName] = useState<string | null>(null);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberRole, setEditingMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');

  const userMembership = household?.members?.find((m) => m.userId === user?.id);
  const userRole = userMembership?.role;
  const isOwner = userRole === 'OWNER';
  const isAdmin = userRole === 'ADMIN' || isOwner;

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) => authApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data),
  });

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
    <div data-testid="settings-page">
      <PageHeader title={t('settings.title')} />

      <div className={styles.sections}>
        <section className={styles.section} data-testid="profile-section">
          <h2 className={styles.sectionTitle}>{t('settings.profile')}</h2>
          <div className={styles.card}>
            <div className={styles.profileInfo}>
              <div className={styles.avatar} data-testid="user-avatar">
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
                      data-testid="profile-name-input"
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.label}>{t('auth.email')}</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      data-testid="profile-email-input"
                    />
                  </div>
                  {profileError && <p className={styles.error}>{profileError}</p>}
                  <div className={styles.profileEditActions}>
                    <Button variant="ghost" onClick={handleCancelProfileEdit} data-testid="cancel-profile-btn">
                      {t('common.cancel')}
                    </Button>
                    <Button variant="primary" onClick={handleSaveProfile} data-testid="save-profile-btn">
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.profileDisplay}>
                  <div className={styles.profileText}>
                    <p className={styles.userName} data-testid="user-name">{user?.name}</p>
                    <p className={styles.userEmail} data-testid="user-email">{user?.email}</p>
                  </div>
                  <div className={styles.profileActions}>
                    <Button variant="ghost" size="sm" onClick={handleEditProfile} data-testid="edit-profile-btn">
                      {t('common.edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleOpenPasswordModal} data-testid="change-password-btn">
                      {t('settings.changePassword')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section} data-testid="linked-accounts-section">
          <h2 className={styles.sectionTitle}>{t('settings.linkedAccounts')}</h2>
          <div className={styles.card}>
            {(oauthError || oauthLinkedProvider) && (
              <div className={`${styles.linkedAccountsMessage} ${oauthLinkedProvider ? styles.success : styles.error}`}>
                {oauthLinkedProvider && t('settings.accountLinked', { provider: oauthLinkedProvider })}
                {oauthError && oauthError}
              </div>
            )}
            <div className={styles.linkedAccountsList}>
              <div className={styles.linkedAccount}>
                <div className={styles.linkedAccountInfo}>
                  <svg className={styles.linkedAccountIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Google</span>
                </div>
                {hasGoogle ? (
                  <span className={styles.linkedBadge}>
                    <span className="material-symbols-outlined">check_circle</span>
                    {t('settings.connected')}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleLinkAccount('google')}
                    loading={isLinkingGoogle}
                    data-testid="link-google-btn"
                  >
                    {t('settings.connect')}
                  </Button>
                )}
              </div>
              <div className={styles.linkedAccount}>
                <div className={styles.linkedAccountInfo}>
                  <svg className={styles.linkedAccountIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span>GitHub</span>
                </div>
                {hasGithub ? (
                  <span className={styles.linkedBadge}>
                    <span className="material-symbols-outlined">check_circle</span>
                    {t('settings.connected')}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleLinkAccount('github')}
                    loading={isLinkingGithub}
                    data-testid="link-github-btn"
                  >
                    {t('settings.connect')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {household && (
          <section className={styles.section} data-testid="household-section">
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
                        data-testid="household-name-input"
                      />
                      <div className={styles.inlineActions}>
                        <Button variant="ghost" size="sm" onClick={handleCancelHouseholdNameEdit} data-testid="cancel-household-name-btn">
                          {t('common.cancel')}
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleSaveHouseholdName} data-testid="save-household-name-btn">
                          {t('common.save')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={styles.householdName} data-testid="household-name">
                        {household.name}
                        {isAdmin && (
                          <button
                            className={styles.editIconBtn}
                            onClick={handleEditHouseholdName}
                            aria-label={t('common.edit')}
                            data-testid="edit-household-name-btn"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                        )}
                      </p>
                      <p className={styles.householdMeta} data-testid="household-members-count">
                        {household.members?.length || 0} {t('settings.members')}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.inviteSection} data-testid="invite-section">
                <h3>{t('settings.inviteMembers')}</h3>
                <p>{t('settings.inviteMembersDesc')}</p>
                {showInvite && inviteCode ? (
                  <div className={styles.inviteCode} data-testid="invite-code-display">
                    <span className={styles.code} data-testid="invite-code">{inviteCode}</span>
                    <button onClick={handleCopyCode} className={styles.copyBtn} data-testid="copy-invite-code-btn">
                      <span className="material-symbols-outlined">content_copy</span>
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={handleCreateInvite}
                    loading={createInvite.isPending}
                    iconLeft={<span className="material-symbols-outlined">add_link</span>}
                    data-testid="generate-invite-code-btn"
                  >
                    {t('settings.generateInviteCode')}
                  </Button>
                )}
              </div>

              <div className={styles.divider} />

              <div className={styles.membersSection} data-testid="members-section">
                <h3>{t('settings.members')}</h3>
                <div className={styles.membersList} data-testid="members-list">
                  {household.members?.map((member) => (
                    <div key={member.userId} className={styles.member} data-testid={`member-${member.userId}`}>
                      <div className={styles.memberAvatar}>
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName} data-testid={`member-name-${member.userId}`}>
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
                                  data-testid="role-select"
                                >
                                  <option value="ADMIN">{t('household.role.ADMIN')}</option>
                                  <option value="MEMBER">{t('household.role.MEMBER')}</option>
                                </select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSaveRole(member.userId)}
                                  data-testid="save-role-btn"
                                >
                                  {t('common.save')}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleCancelRoleEdit} data-testid="cancel-role-btn">
                                  {t('common.cancel')}
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={t('settings.editRole')}
                                  onClick={() =>
                                    handleStartEditRole(member.userId, member.role as 'ADMIN' | 'MEMBER')
                                  }
                                  data-testid="edit-role-btn"
                                >
                                  <span className="material-symbols-outlined">edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={t('settings.removeMember')}
                                  onClick={() =>
                                    handleRemoveMember(member.userId, member.user.name)
                                  }
                                  data-testid="remove-member-btn"
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
                data-testid="leave-household-btn"
              >
                {t('settings.leaveHousehold')}
              </Button>
            </div>
          </section>
        )}

        <section className={styles.section} data-testid="language-section">
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
                data-testid="language-select"
              >
                <option value="en">{t('settings.languageEn')}</option>
                <option value="pt">{t('settings.languagePt')}</option>
              </select>
            </div>
          </div>
        </section>

        <section className={styles.section} data-testid="notifications-section">
          <h2 className={styles.sectionTitle}>{t('settings.notifications')}</h2>
          <div className={styles.card}>
            <div className={styles.notificationSection}>
              <div className={styles.notificationHeader}>
                <div className={styles.notificationIcon}>
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <div>
                  <p className={styles.notificationTitle}>{t('settings.pushNotifications')}</p>
                  <p className={styles.notificationSubtitle}>{t('settings.enableNotificationsDesc')}</p>
                </div>
              </div>

              {!isSupported && (
                <div className={styles.notificationStatus + ' ' + styles.error}>
                  <span className="material-symbols-outlined">error</span>
                  <span>{t('settings.notificationsDisabled')}</span>
                </div>
              )}

              {isSupported && permissionState !== 'granted' && (
                <div className={styles.enableButton}>
                  <Button
                    variant="primary"
                    onClick={() => subscribe()}
                    iconLeft={<span className="material-symbols-outlined">notifications_active</span>}
                  >
                    {t('settings.enableNotifications')}
                  </Button>
                </div>
              )}

              {isSupported && permissionState === 'granted' && subscription && (
                <>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <p className={styles.toggleLabel}>{t('settings.morningReminder')}</p>
                      <p className={styles.toggleDesc}>{t('settings.morningReminderDesc')}</p>
                    </div>
                    <input
                      type="time"
                      className={styles.timeInput}
                      value={settings?.morningReminderTime || '09:00'}
                      onChange={(e) => updateSettings({ morningReminderTime: e.target.value, morningReminderEnabled: true })}
                      disabled={isUpdating}
                    />
                  </div>

                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <p className={styles.toggleLabel}>{t('settings.taskCreatedNotifications')}</p>
                      <p className={styles.toggleDesc}>{t('settings.taskCreatedNotificationsDesc')}</p>
                    </div>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={settings?.taskCreatedEnabled ?? true}
                        onChange={(e) => updateSettings({ taskCreatedEnabled: e.target.checked })}
                        disabled={isUpdating}
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                  </div>

                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <p className={styles.toggleLabel}>{t('settings.taskCompletedNotifications')}</p>
                      <p className={styles.toggleDesc}>{t('settings.taskCompletedNotificationsDesc')}</p>
                    </div>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={settings?.taskCompletedEnabled ?? true}
                        onChange={(e) => updateSettings({ taskCompletedEnabled: e.target.checked })}
                        disabled={isUpdating}
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section} data-testid="account-section">
          <h2 className={styles.sectionTitle}>{t('settings.account')}</h2>
          <div className={styles.card}>
            <Button
              variant="ghost"
              onClick={logout}
              iconLeft={<span className="material-symbols-outlined">logout</span>}
              data-testid="logout-btn"
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

      <ConfirmDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        title={`${t('settings.removeMember')}?`}
        message={t('settings.removeMemberMessage', { name: memberToRemoveName || '' })}
        confirmLabel={t('settings.remove')}
        variant="danger"
      />

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
